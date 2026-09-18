import path from 'path';
import sqlite3 from 'sqlite3';
import { Room } from '../models/Room';
import { Participant } from '../models/Participant';
import { RoomData } from '../types';

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'syncparty.db');

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, Room>;
  private socketToRoomMap: Map<string, string>; // socketId -> roomId
  private roomCleanupTimers: Map<string, NodeJS.Timeout>; // roomId -> cleanup timer
  private db!: sqlite3.Database;

  constructor() {
    this.rooms = new Map<string, Room>();
    this.socketToRoomMap = new Map<string, string>();
    this.roomCleanupTimers = new Map<string, NodeJS.Timeout>();
    this.initDatabase();
  }

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  /**
   * Initializes SQLite persistent database for rooms.
   */
  private initDatabase(): void {
    try {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('[SQLite] Failed to connect to database:', err);
        } else {
          console.log(`[SQLite] Connected to persistent database at ${DB_PATH}`);
          this.db.run(
            `CREATE TABLE IF NOT EXISTS rooms (
              id TEXT PRIMARY KEY,
              host_id TEXT,
              video_id TEXT,
              current_time REAL,
              play_state TEXT,
              creator_token TEXT,
              created_at INTEGER,
              updated_at INTEGER
            )`,
            (createErr) => {
              if (createErr) {
                console.error('[SQLite] Error creating rooms table:', createErr);
              } else {
                this.loadPersistedRooms();
              }
            }
          );
        }
      });
    } catch (dbErr) {
      console.error('[SQLite Init Error]:', dbErr);
    }
  }

  /**
   * Restores active watch party room states from SQLite on server start.
   */
  public loadPersistedRooms(): void {
    if (!this.db) return;
    this.db.all('SELECT * FROM rooms', [], (err, rows: any[]) => {
      if (err) {
        console.error('[SQLite] Error loading persisted rooms:', err);
        return;
      }
      if (rows && rows.length > 0) {
        for (const row of rows) {
          if (!this.rooms.has(row.id)) {
            const room = new Room(row.id, row.video_id || '', row.creator_token || undefined);
            room.updateVideoState({
              videoId: row.video_id || '',
              currentTime: row.current_time || 0,
              playState: 'paused', // default paused on reload
            });
            this.rooms.set(row.id, room);
          }
        }
        console.log(`[SQLite] Restored ${rows.length} rooms from persistent storage.`);
      }
    });
  }

  /**
   * Upserts the room's current state to the SQLite database.
   */
  public saveRoomState(room: Room): void {
    if (!this.db) return;
    const now = Date.now();
    const videoState = room.videoState;
    this.db.run(
      `INSERT INTO rooms (id, host_id, video_id, current_time, play_state, creator_token, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         host_id = excluded.host_id,
         video_id = excluded.video_id,
         current_time = excluded.current_time,
         play_state = excluded.play_state,
         updated_at = excluded.updated_at`,
      [
        room.id,
        room.hostId,
        videoState.videoId,
        videoState.currentTime,
        videoState.playState,
        room.creatorToken,
        room.createdAt,
        now,
      ],
      (err) => {
        if (err) {
          console.error(`[SQLite] Error saving room ${room.id}:`, err);
        }
      }
    );
  }

  /**
   * Generates a random alphanumeric room code (e.g. "watch-7x9k2").
   */
  public generateRoomCode(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Creates a new room with a given or auto-generated ID.
   */
  public createRoom(roomId?: string, initialVideoId?: string, creatorToken?: string): Room {
    const id = roomId ? roomId.trim() : this.generateRoomCode();
    
    if (this.rooms.has(id)) {
      const existing = this.rooms.get(id)!;
      if (initialVideoId && !existing.videoState.videoId) {
        existing.updateVideoState({ videoId: initialVideoId });
        this.saveRoomState(existing);
      }
      return existing;
    }

    const room = new Room(id, initialVideoId || '', creatorToken);
    this.rooms.set(id, room);
    this.saveRoomState(room);
    return room;
  }

  /**
   * Retrieves an existing room.
   */
  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Gets or creates a room if it doesn't already exist.
   */
  public getOrCreateRoom(roomId: string, initialVideoId?: string, creatorToken?: string): { room: Room; isNew: boolean } {
    const existingRoom = this.rooms.get(roomId);
    if (existingRoom) {
      if (initialVideoId && !existingRoom.videoState.videoId) {
        existingRoom.updateVideoState({ videoId: initialVideoId });
        this.saveRoomState(existingRoom);
      }
      return { room: existingRoom, isNew: false };
    }
    const newRoom = this.createRoom(roomId, initialVideoId, creatorToken);
    return { room: newRoom, isNew: true };
  }

  /**
   * Gets a room by participant socket ID.
   */
  public getRoomBySocketId(socketId: string): Room | undefined {
    const roomId = this.socketToRoomMap.get(socketId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  /**
   * Handles user joining a room.
   * Secure RBAC: creatorToken validation, does NOT trust client role booleans.
   */
  public joinRoom(
    roomId: string,
    socketId: string,
    username: string,
    creatorToken?: string,
    initialVideoId?: string
  ): { room: Room; participant: Participant; isNewRoom: boolean } {
    // If socket is already in another room, leave it first
    const currentRoomId = this.socketToRoomMap.get(socketId);
    if (currentRoomId && currentRoomId !== roomId) {
      this.leaveRoom(socketId);
    }

    // Cancel any scheduled deletion timer if room is being re-joined
    if (this.roomCleanupTimers.has(roomId)) {
      clearTimeout(this.roomCleanupTimers.get(roomId)!);
      this.roomCleanupTimers.delete(roomId);
    }

    const { room, isNew } = this.getOrCreateRoom(roomId, initialVideoId, creatorToken);
    if (initialVideoId && isNew && !room.videoState.videoId) {
      room.updateVideoState({ videoId: initialVideoId });
    }

    const participant = new Participant(socketId, username);
    
    // Securely add participant: Host only if first or valid creatorToken
    room.addParticipant(participant, creatorToken);
    this.socketToRoomMap.set(socketId, roomId);

    this.saveRoomState(room);

    return { room, participant, isNewRoom: isNew };
  }

  /**
   * Handles user leaving a room.
   */
  public leaveRoom(
    socketId: string,
    targetRoomId?: string
  ): {
    room: Room | null;
    participant: Participant | null;
    newHost: Participant | null;
    roomDeleted: boolean;
  } {
    const roomId = targetRoomId || this.socketToRoomMap.get(socketId);
    if (!roomId) {
      return { room: null, participant: null, newHost: null, roomDeleted: false };
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      this.socketToRoomMap.delete(socketId);
      return { room: null, participant: null, newHost: null, roomDeleted: false };
    }

    const wasHost = room.isHost(socketId);
    const participant = room.removeParticipant(socketId) || null;
    this.socketToRoomMap.delete(socketId);

    let newHost: Participant | null = null;
    let roomDeleted = false;

    if (room.isEmpty()) {
      // Clear any existing cleanup timer for this room
      if (this.roomCleanupTimers.has(roomId)) {
        clearTimeout(this.roomCleanupTimers.get(roomId)!);
      }
      // Schedule cleanup after a 60-second grace period
      const timer = setTimeout(() => {
        const r = this.rooms.get(roomId);
        if (r && r.isEmpty()) {
          this.rooms.delete(roomId);
        }
        this.roomCleanupTimers.delete(roomId);
      }, 60000);
      this.roomCleanupTimers.set(roomId, timer);
      roomDeleted = false;
    } else if (wasHost) {
      // Transfer host role to next participant
      newHost = room.assignNextHost();
      this.saveRoomState(room);
    }

    return { room, participant, newHost, roomDeleted };
  }

  /**
   * Unlinks a socket ID from room mappings (e.g. after kick).
   */
  public unlinkSocket(socketId: string): void {
    this.socketToRoomMap.delete(socketId);
  }

  /**
   * Deletes a room and cleans up socket mappings.
   */
  public removeRoom(roomId: string): boolean {
    if (this.roomCleanupTimers.has(roomId)) {
      clearTimeout(this.roomCleanupTimers.get(roomId)!);
      this.roomCleanupTimers.delete(roomId);
    }
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.getParticipants().forEach((p) => {
      this.socketToRoomMap.delete(p.id);
    });

    if (this.db) {
      this.db.run('DELETE FROM rooms WHERE id = ?', [roomId], () => {});
    }

    return this.rooms.delete(roomId);
  }

  /**
   * Lists all active rooms as serialized RoomData.
   */
  public getAllRooms(): RoomData[] {
    return Array.from(this.rooms.values()).map((r) => r.getState());
  }

  /**
   * Returns all active Room model instances for heartbeat and state sync.
   */
  public getAllRoomsRaw(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Gets total active room count.
   */
  public getRoomCount(): number {
    return this.rooms.size;
  }
}
