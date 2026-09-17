import { Room } from '../models/Room';
import { Participant } from '../models/Participant';
import { RoomData, ParticipantRole } from '../types';

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, Room>;
  private socketToRoomMap: Map<string, string>; // socketId -> roomId

  constructor() {
    this.rooms = new Map<string, Room>();
    this.socketToRoomMap = new Map<string, string>();
  }

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
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
  public createRoom(roomId?: string, initialVideoId?: string): Room {
    const id = roomId ? roomId.trim() : this.generateRoomCode();
    
    if (this.rooms.has(id)) {
      return this.rooms.get(id)!;
    }

    const room = new Room(id, initialVideoId);
    this.rooms.set(id, room);
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
  public getOrCreateRoom(roomId: string, initialVideoId?: string): { room: Room; isNew: boolean } {
    const existingRoom = this.rooms.get(roomId);
    if (existingRoom) {
      return { room: existingRoom, isNew: false };
    }
    const newRoom = this.createRoom(roomId, initialVideoId);
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
   */
  public joinRoom(
    roomId: string,
    socketId: string,
    username: string,
    preferredRole?: ParticipantRole,
    isCreator?: boolean
  ): { room: Room; participant: Participant; isNewRoom: boolean } {
    // If socket is already in another room, leave it first
    const currentRoomId = this.socketToRoomMap.get(socketId);
    if (currentRoomId && currentRoomId !== roomId) {
      this.leaveRoom(socketId);
    }

    const { room, isNew } = this.getOrCreateRoom(roomId);
    const participant = new Participant(socketId, username);
    
    room.addParticipant(participant, preferredRole, isCreator);
    this.socketToRoomMap.set(socketId, roomId);

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
      // Clean up empty room
      this.rooms.delete(roomId);
      roomDeleted = true;
    } else if (wasHost) {
      // Transfer host role to the next participant
      newHost = room.assignNextHost();
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
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.getParticipants().forEach((p) => {
      this.socketToRoomMap.delete(p.id);
    });

    return this.rooms.delete(roomId);
  }

  /**
   * Lists all active rooms.
   */
  public getAllRooms(): RoomData[] {
    return Array.from(this.rooms.values()).map((r) => r.getState());
  }

  /**
   * Gets total active room count.
   */
  public getRoomCount(): number {
    return this.rooms.size;
  }
}
