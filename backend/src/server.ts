import express, { Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

import { RoomManager } from './managers/RoomManager';
import { Participant } from './models/Participant';
import { Room } from './models/Room';
import {
  JoinRoomPayload,
  LeaveRoomPayload,
  PlayPayload,
  PausePayload,
  SeekPayload,
  ChangeVideoPayload,
  SyncStatePayload,
  AssignRolePayload,
  RemoveParticipantPayload,
  SendMessagePayload,
  ChatMessage,
  ActionRejectedPayload,
  ParticipantRole,
  SendReactionPayload,
  FloatingReaction,
  ControlRequest,
  ControlResponsePayload,
} from './types';

// Initialize Express App
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Allowed Origins: Supports FRONTEND_URL, CLIENT_ORIGIN, comma-separated URLs, or fallback to wildcard for dev
const clientOriginsEnv = process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || '*';
const allowedOrigins = clientOriginsEnv.includes(',')
  ? clientOriginsEnv.split(',').map((o) => o.trim())
  : clientOriginsEnv === '*'
  ? '*'
  : [clientOriginsEnv.trim()];

const corsOriginHandler = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  // Allow requests with no origin (like mobile apps, curl, server-to-server) or when wildcard is set
  if (!origin || allowedOrigins === '*' || (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin))) {
    callback(null, true);
  } else {
    // In cloud hosting like Render, also allow preview URLs or log origin
    callback(null, true);
  }
};

// Middleware
app.use(
  cors({
    origin: corsOriginHandler,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);
app.use(express.json());

// Initialize HTTP and Socket.IO Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOriginHandler,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Singleton Room Manager
const roomManager = RoomManager.getInstance();

// Helper to emit rejection errors
function rejectAction(
  socket: Socket,
  action: string,
  message: string,
  requiredRoles: ParticipantRole[] = []
): void {
  const payload: ActionRejectedPayload = {
    action,
    message,
    requiredRoles,
  };
  console.warn(`[RBAC Rejected] Socket ${socket.id} attempted "${action}": ${message}`);
  socket.emit('action_rejected', payload);
  socket.emit('error_message', { action, message });
}

// In-Memory Sliding Window Rate Limiting
const chatRateLimiter = new Map<string, number[]>();
const reactionRateLimiter = new Map<string, number[]>();
const controlCooldownMap = new Map<string, number>();

function checkRateLimit(
  limiterMap: Map<string, number[]>,
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const history = (limiterMap.get(key) || []).filter((t) => now - t < windowMs);
  if (history.length >= maxRequests) {
    limiterMap.set(key, history);
    return false;
  }
  history.push(now);
  limiterMap.set(key, history);
  return true;
}

// ==========================================
// REST API Endpoints
// ==========================================

/**
 * Health check & status endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'YouTube Watch Party Server',
    port: PORT,
    activeRooms: roomManager.getRoomCount(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to YouTube Watch Party Backend API with RBAC',
    roles: ['Host', 'Moderator', 'Participant', 'Viewer'],
    endpoints: {
      health: 'GET /health',
      rooms: 'GET /api/rooms',
      getRoom: 'GET /api/rooms/:roomId',
      createRoom: 'POST /api/rooms',
    },
  });
});

/**
 * List all active rooms
 */
app.get('/api/rooms', (_req: Request, res: Response) => {
  const rooms = roomManager.getAllRooms();
  res.json({ success: true, count: rooms.length, rooms });
});

/**
 * Get room info by roomId
 */
app.get('/api/rooms/:roomId', (req: Request, res: Response) => {
  const paramRoomId = req.params.roomId;
  const roomId = Array.isArray(paramRoomId) ? paramRoomId[0] : paramRoomId;
  if (!roomId) {
    return res.status(400).json({ success: false, message: 'Room ID is required' });
  }

  const room = roomManager.getRoom(roomId);
  if (!room) {
    return res.status(404).json({ success: false, message: 'Room not found' });
  }

  return res.json({ success: true, room: room.getState() });
});

/**
 * Create a new room with a unique code or custom ID
 */
app.post('/api/rooms', (req: Request, res: Response) => {
  const { roomId, videoId } = req.body || {};
  const room = roomManager.createRoom(roomId, videoId);
  res.status(201).json({
    success: true,
    message: 'Room created successfully',
    roomId: room.id,
    room: room.getState(),
  });
});

// ==========================================
// Socket.IO Event Handlers (with RBAC)
// ==========================================

io.on('connection', (socket: Socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  /**
   * Event: join_room
   * Payload: { roomId: string, username: string }
   * - Room creator / first user is auto-assigned 'Host' role
   * - Subsequent users get 'Participant' role
   */
  socket.on('join_room', (payload: JoinRoomPayload) => {
    try {
      const { roomId, username, role, isCreator, initialVideoId, videoId } = payload || {};
      if (!roomId || typeof roomId !== 'string') {
        socket.emit('error_message', { message: 'Invalid or missing roomId' });
        return;
      }

      const cleanRoomId = roomId.trim();
      const cleanUsername =
        username && typeof username === 'string'
          ? username.trim()
          : `User_${socket.id.substring(0, 4)}`;

      const cleanInitialVideoId = (initialVideoId || videoId || '').trim();

      // Join room in RoomManager
      const { room, participant, isNewRoom } = roomManager.joinRoom(
        cleanRoomId,
        socket.id,
        cleanUsername,
        role,
        isCreator,
        cleanInitialVideoId || undefined
      );

      // Join Socket.IO room channel
      socket.join(cleanRoomId);

      console.log(
        `[User Joined] Room: ${cleanRoomId} | User: ${participant.username} (${participant.id}) | Role: ${participant.role} | IsNew: ${isNewRoom}`
      );

      // 1. Confirm join to the client with participant details and room state
      socket.emit('room_joined', {
        roomId: cleanRoomId,
        participant: participant.toJSON(),
        room: room.getState(),
      });

      // 2. Immediately send fully computed current video state to syncing user so late-joiners never buffer
      socket.emit('sync_state', room.getSyncPayload());

      // 3. Notify other participants in the room that someone joined
      const joinedPayload = {
        userId: participant.id,
        username: participant.username,
        role: participant.role,
        participants: room.getParticipants().map((p) => p.toJSON()),
        participant: participant.toJSON(),
        message: `${participant.username} has joined the party!`,
      };
      socket.to(cleanRoomId).emit('user_joined', joinedPayload);

      // 4. Broadcast updated participants list to everyone in the room
      io.to(cleanRoomId).emit('participants_updated', {
        participants: room.getParticipants().map((p) => p.toJSON()),
        hostId: room.hostId,
      });
    } catch (err: any) {
      console.error(`[Error in join_room]:`, err);
      socket.emit('error_message', { message: 'Failed to join room' });
    }
  });

  /**
   * Event: leave_room
   * Payload: { roomId?: string }
   */
  socket.on('leave_room', (payload?: LeaveRoomPayload) => {
    try {
      const targetRoomId = payload?.roomId;
      handleLeave(socket, targetRoomId);
    } catch (err: any) {
      console.error(`[Error in leave_room]:`, err);
    }
  });

  // ==========================================
  // RBAC Playback Controls (Host / Moderator only)
  // ==========================================

  /**
   * Event: play
   * Payload: { roomId?: string, currentTime?: number }
   * Permissions: Host, Moderator
   */
  socket.on('play', (payload?: PlayPayload) => {
    try {
      const room = payload?.roomId
        ? roomManager.getRoom(payload.roomId)
        : roomManager.getRoomBySocketId(socket.id);

      if (!room) {
        return socket.emit('error_message', { message: 'Room not found for play event' });
      }

      // RBAC Check
      if (!room.canControlPlayback(socket.id)) {
        return rejectAction(
          socket,
          'play',
          'Permission denied: Only the Host and Moderators can start video playback.',
          ['Host', 'Moderator']
        );
      }

      const participant = room.getParticipant(socket.id);
      const currentTime =
        typeof payload?.currentTime === 'number'
          ? payload.currentTime
          : room.videoState.currentTime;

      // Update room state
      room.updateVideoState({
        playState: 'playing',
        currentTime,
      });

      console.log(
        `[Play] Room: ${room.id} | Time: ${currentTime}s | Triggered by: ${participant?.username} (${participant?.role})`
      );

      // Broadcast play event and sync_state to room
      const eventData = {
        roomId: room.id,
        videoId: room.videoState.videoId,
        currentTime,
        playState: 'playing',
        lastUpdated: Date.now(),
        triggeredBy: participant?.toJSON(),
      };

      io.to(room.id).emit('play', eventData);
      socket.to(room.id).emit('sync_state', eventData);
    } catch (err: any) {
      console.error(`[Error in play]:`, err);
    }
  });

  /**
   * Event: pause
   * Payload: { roomId?: string, currentTime?: number }
   * Permissions: Host, Moderator
   */
  socket.on('pause', (payload?: PausePayload) => {
    try {
      const room = payload?.roomId
        ? roomManager.getRoom(payload.roomId)
        : roomManager.getRoomBySocketId(socket.id);

      if (!room) {
        return socket.emit('error_message', { message: 'Room not found for pause event' });
      }

      // RBAC Check
      if (!room.canControlPlayback(socket.id)) {
        return rejectAction(
          socket,
          'pause',
          'Permission denied: Only the Host and Moderators can pause video playback.',
          ['Host', 'Moderator']
        );
      }

      const participant = room.getParticipant(socket.id);
      const currentTime =
        typeof payload?.currentTime === 'number'
          ? payload.currentTime
          : room.videoState.currentTime;

      // Update room state
      room.updateVideoState({
        playState: 'paused',
        currentTime,
      });

      console.log(
        `[Pause] Room: ${room.id} | Time: ${currentTime}s | Triggered by: ${participant?.username} (${participant?.role})`
      );

      // Broadcast pause event and sync_state to room
      const eventData = {
        roomId: room.id,
        videoId: room.videoState.videoId,
        currentTime,
        playState: 'paused',
        lastUpdated: Date.now(),
        triggeredBy: participant?.toJSON(),
      };

      io.to(room.id).emit('pause', eventData);
      socket.to(room.id).emit('sync_state', eventData);
    } catch (err: any) {
      console.error(`[Error in pause]:`, err);
    }
  });

  /**
   * Event: seek
   * Payload: { roomId?: string, currentTime: number }
   * Permissions: Host, Moderator
   */
  socket.on('seek', (payload: SeekPayload) => {
    try {
      const targetTime = typeof payload?.time === 'number' ? payload.time : payload?.currentTime;
      if (typeof targetTime !== 'number') {
        return socket.emit('error_message', {
          message: 'Invalid seek payload. time or currentTime number is required.',
        });
      }

      const room = payload.roomId
        ? roomManager.getRoom(payload.roomId)
        : roomManager.getRoomBySocketId(socket.id);

      if (!room) {
        return socket.emit('error_message', { message: 'Room not found for seek event' });
      }

      // RBAC Check
      if (!room.canControlPlayback(socket.id)) {
        return rejectAction(
          socket,
          'seek',
          'Permission denied: Only the Host and Moderators can seek the video timeline.',
          ['Host', 'Moderator']
        );
      }

      const participant = room.getParticipant(socket.id);

      // Update room state with authoritative seek target
      room.updateVideoState({
        currentTime: targetTime,
      });

      console.log(
        `[Seek] Room: ${room.id} | Seeked to: ${targetTime}s | Triggered by: ${participant?.username} (${participant?.role})`
      );

      // Broadcast seek event and computed sync_state to room
      const eventData = {
        roomId: room.id,
        videoId: room.videoState.videoId,
        currentTime: targetTime,
        playState: room.videoState.playState,
        lastUpdated: room.videoState.lastUpdated,
        lastActionTimestamp: room.videoState.lastActionTimestamp,
        triggeredBy: participant?.toJSON(),
      };

      io.to(room.id).emit('seek', eventData);
      socket.to(room.id).emit('sync_state', eventData);
    } catch (err: any) {
      console.error(`[Error in seek]:`, err);
    }
  });

  /**
   * Event: change_video
   * Payload: { roomId?: string, videoId: string }
   * Permissions: Host, Moderator
   */
  socket.on('change_video', (payload: ChangeVideoPayload) => {
    try {
      if (!payload || !payload.videoId || typeof payload.videoId !== 'string') {
        return socket.emit('error_message', { message: 'Invalid videoId for change_video' });
      }

      const room = payload.roomId
        ? roomManager.getRoom(payload.roomId)
        : roomManager.getRoomBySocketId(socket.id);

      if (!room) {
        return socket.emit('error_message', { message: 'Room not found for change_video' });
      }

      // RBAC Check
      if (!room.canChangeVideo(socket.id)) {
        return rejectAction(
          socket,
          'change_video',
          'Permission denied: Only the Host and Moderators can change the video.',
          ['Host', 'Moderator']
        );
      }

      const participant = room.getParticipant(socket.id);
      const cleanVideoId = payload.videoId.trim();

      room.updateVideoState({
        videoId: cleanVideoId,
        currentTime: 0,
        playState: 'playing',
      });

      console.log(
        `[Change Video] Room: ${room.id} | Video: ${cleanVideoId} | Triggered by: ${participant?.username} (${participant?.role})`
      );

      // Broadcast video_changed to everyone in the room
      const eventData = {
        roomId: room.id,
        videoId: cleanVideoId,
        currentTime: 0,
        playState: 'playing',
        lastUpdated: Date.now(),
        changedBy: participant?.toJSON(),
        room: room.getState(),
      };

      io.to(room.id).emit('video_changed', eventData);
      io.to(room.id).emit('sync_state', eventData);
    } catch (err: any) {
      console.error(`[Error in change_video]:`, err);
    }
  });

  /**
   * Event: sync_state
   * Payload: { roomId?: string, playState: string, currentTime: number, videoId?: string }
   * Enforces RBAC so participants cannot maliciously broadcast video state overrides
   */
  socket.on('sync_state', (payload: SyncStatePayload) => {
    try {
      if (!payload) return;

      const room = payload.roomId
        ? roomManager.getRoom(payload.roomId)
        : roomManager.getRoomBySocketId(socket.id);

      if (!room) {
        return socket.emit('error_message', { message: 'Room not found for sync_state' });
      }

      // RBAC Check
      if (!room.canControlPlayback(socket.id)) {
        return rejectAction(
          socket,
          'sync_state',
          'Permission denied: Only the Host and Moderators can synchronize room playback state.',
          ['Host', 'Moderator']
        );
      }

      const participant = room.getParticipant(socket.id);

      const updatedVideoState = room.updateVideoState({
        playState: payload.playState,
        currentTime: payload.currentTime,
        ...(payload.videoId ? { videoId: payload.videoId } : {}),
      });

      console.log(
        `[Sync State] Room: ${room.id} | State: ${payload.playState} | Time: ${payload.currentTime}s | By: ${participant?.username}`
      );

      socket.to(room.id).emit('sync_state', {
        roomId: room.id,
        videoId: updatedVideoState.videoId,
        currentTime: updatedVideoState.currentTime,
        playState: updatedVideoState.playState,
        lastUpdated: updatedVideoState.lastUpdated,
        updatedBy: participant?.toJSON(),
      });
    } catch (err: any) {
      console.error(`[Error in sync_state]:`, err);
    }
  });

  // ==========================================
  // RBAC Host-Only Moderation Events
  // ==========================================

  /**
   * Event: assign_role
   * Payload: { roomId?: string, userId: string, role: ParticipantRole }
   * Permissions: Host only
   */
  socket.on('assign_role', (payload: AssignRolePayload) => {
    try {
      if (!payload || !payload.userId || !payload.role) {
        return socket.emit('error_message', {
          message: 'Invalid payload. userId and role are required.',
        });
      }

      const room = payload.roomId
        ? roomManager.getRoom(payload.roomId)
        : roomManager.getRoomBySocketId(socket.id);

      if (!room) {
        return socket.emit('error_message', { message: 'Room not found' });
      }

      // RBAC Check: Host only
      if (!room.isHost(socket.id)) {
        return rejectAction(
          socket,
          'assign_role',
          'Forbidden: Only the Room Host can assign roles.',
          ['Host']
        );
      }

      const result = room.assignRole(payload.userId, payload.role, socket.id);
      if (!result.success || !result.targetParticipant) {
        return socket.emit('error_message', {
          action: 'assign_role',
          message: result.error || 'Failed to assign role',
        });
      }

      const hostParticipant = room.getParticipant(socket.id);
      const targetParticipant = result.targetParticipant;

      console.log(
        `[Role Assigned] Room: ${room.id} | User: ${targetParticipant.username} (${targetParticipant.id}) -> Role: ${targetParticipant.role} | Assigned by: ${hostParticipant?.username}`
      );

      // 1. Broadcast role_assigned event to all users in the room
      io.to(room.id).emit('role_assigned', {
        roomId: room.id,
        userId: targetParticipant.id,
        username: targetParticipant.username,
        role: targetParticipant.role,
        previousRole: result.previousRole,
        hostTransferred: !!result.hostTransferred,
        assignedBy: hostParticipant?.toJSON(),
        message: `${targetParticipant.username} was assigned the role of ${targetParticipant.role}.`,
      });

      // 2. If Host was transferred, also emit host_changed
      if (result.hostTransferred) {
        io.to(room.id).emit('host_changed', {
          roomId: room.id,
          newHostId: targetParticipant.id,
          newHost: targetParticipant.toJSON(),
          message: `${targetParticipant.username} is now the Room Host.`,
        });
      }

      // 3. Broadcast updated participants list
      io.to(room.id).emit('participants_updated', {
        participants: room.getParticipants().map((p) => p.toJSON()),
        hostId: room.hostId,
      });
    } catch (err: any) {
      console.error(`[Error in assign_role]:`, err);
      socket.emit('error_message', { message: 'Failed to assign role' });
    }
  });

  /**
   * Event: remove_participant
   * Payload: { roomId?: string, userId: string }
   * Permissions: Host only
   */
  socket.on('remove_participant', (payload: RemoveParticipantPayload) => {
    try {
      if (!payload || !payload.userId) {
        return socket.emit('error_message', {
          message: 'Invalid payload. userId is required.',
        });
      }

      const room = payload.roomId
        ? roomManager.getRoom(payload.roomId)
        : roomManager.getRoomBySocketId(socket.id);

      if (!room) {
        return socket.emit('error_message', { message: 'Room not found' });
      }

      // RBAC Check: Host only
      if (!room.isHost(socket.id)) {
        return rejectAction(
          socket,
          'remove_participant',
          'Forbidden: Only the Room Host can remove participants.',
          ['Host']
        );
      }

      const result = room.removeParticipantByHost(payload.userId, socket.id);
      if (!result.success || !result.removedParticipant) {
        return socket.emit('error_message', {
          action: 'remove_participant',
          message: result.error || 'Failed to remove participant',
        });
      }

      const removedUser = result.removedParticipant;
      const hostParticipant = room.getParticipant(socket.id);

      // Unlink from RoomManager
      roomManager.unlinkSocket(removedUser.id);

      console.log(
        `[Participant Removed] Room: ${room.id} | User: ${removedUser.username} (${removedUser.id}) | Kicked by: ${hostParticipant?.username}`
      );

      // Direct notification & leave room channel for the target socket
      const targetSocket = io.sockets.sockets.get(removedUser.id);
      if (targetSocket) {
        targetSocket.leave(room.id);
        targetSocket.emit('kicked_from_room', {
          roomId: room.id,
          message: 'You have been removed from the watch party by the Host.',
          removedBy: hostParticipant?.toJSON(),
        });
      }

      // 1. Broadcast participant_removed to remaining users in room
      io.to(room.id).emit('participant_removed', {
        roomId: room.id,
        userId: removedUser.id,
        username: removedUser.username,
        removedBy: hostParticipant?.toJSON(),
        message: `${removedUser.username} was removed from the party by ${hostParticipant?.username || 'the Host'}.`,
      });

      // 2. Broadcast updated participants list
      io.to(room.id).emit('participants_updated', {
        participants: room.getParticipants().map((p) => p.toJSON()),
        hostId: room.hostId,
      });
    } catch (err: any) {
      console.error(`[Error in remove_participant]:`, err);
      socket.emit('error_message', { message: 'Failed to remove participant' });
    }
  });

  // ==========================================
  // General Communication
  // ==========================================

  /**
   * Event: send_message (Live Chat Support with Rate Limiting)
   * Payload: { roomId?: string, message: string }
   */
  socket.on('send_message', (payload: SendMessagePayload) => {
    try {
      if (!payload || !payload.message || typeof payload.message !== 'string') return;

      const trimmedMessage = payload.message.trim();
      if (!trimmedMessage) return;

      // Rate limit: Max 5 messages in 3 seconds
      if (!checkRateLimit(chatRateLimiter, socket.id, 5, 3000)) {
        return socket.emit('action_rejected', {
          action: 'send_message',
          message: 'Chat rate limit exceeded. Please slow down.',
        });
      }

      const room = payload.roomId
        ? roomManager.getRoom(payload.roomId)
        : roomManager.getRoomBySocketId(socket.id);

      if (!room) return;

      const participant = room.getParticipant(socket.id);
      const username = participant ? participant.username : 'Anonymous';
      const role = participant ? participant.role : 'Participant';

      const chatMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        senderId: socket.id,
        username,
        role,
        message: trimmedMessage.slice(0, 500),
        timestamp: Date.now(),
      };

      // Broadcast chat message to everyone in the room
      io.to(room.id).emit('receive_message', chatMessage);
    } catch (err: any) {
      console.error(`[Error in send_message]:`, err);
    }
  });

  /**
   * Event: send_reaction (Floating Screen Reactions)
   * Payload: { roomId?: string, emoji: string }
   */
  socket.on('send_reaction', (payload: SendReactionPayload) => {
    try {
      if (!payload || !payload.emoji || typeof payload.emoji !== 'string') return;

      // Rate limit: Max 8 reactions per 3 seconds
      if (!checkRateLimit(reactionRateLimiter, socket.id, 8, 3000)) {
        return; // silently drop excessive reaction spam
      }

      const room = payload.roomId
        ? roomManager.getRoom(payload.roomId)
        : roomManager.getRoomBySocketId(socket.id);

      if (!room) return;

      const participant = room.getParticipant(socket.id);
      const cleanEmoji = payload.emoji.trim().slice(0, 8);

      const reactionData: FloatingReaction = {
        id: `react_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        emoji: cleanEmoji,
        senderName: participant ? participant.username : 'Participant',
        timestamp: Date.now(),
        xOffset: Math.floor(12 + Math.random() * 76), // 12% to 88% width
      };

      io.to(room.id).emit('receive_reaction', reactionData);
    } catch (err: any) {
      console.error(`[Error in send_reaction]:`, err);
    }
  });

  /**
   * Event: request_control (Participant asks Host for Playback Control)
   * Payload: { roomId?: string }
   */
  socket.on('request_control', (payload?: { roomId?: string }) => {
    try {
      const room = payload?.roomId
        ? roomManager.getRoom(payload.roomId)
        : roomManager.getRoomBySocketId(socket.id);

      if (!room) {
        return socket.emit('error_message', { message: 'Room not found' });
      }

      const participant = room.getParticipant(socket.id);
      if (!participant) return;

      if (participant.canControlPlayback()) {
        return socket.emit('error_message', {
          message: 'You already possess playback control permissions.',
        });
      }

      // Cooldown: 1 request every 15 seconds per user
      const now = Date.now();
      const lastRequest = controlCooldownMap.get(socket.id) || 0;
      if (now - lastRequest < 15000) {
        const waitSec = Math.ceil((15000 - (now - lastRequest)) / 1000);
        return socket.emit('error_message', {
          message: `Please wait ${waitSec}s before requesting control again.`,
        });
      }
      controlCooldownMap.set(socket.id, now);

      const request: ControlRequest = {
        requestId: `ctrl_req_${now}_${Math.random().toString(36).substring(2, 6)}`,
        roomId: room.id,
        requesterId: participant.id,
        requesterName: participant.username,
        requesterRole: participant.role,
        timestamp: now,
      };

      console.log(
        `[Control Requested] User ${participant.username} requested control in room ${room.id}`
      );

      // Notify the Host directly
      const hostSocket = io.sockets.sockets.get(room.hostId);
      if (hostSocket) {
        hostSocket.emit('control_requested', request);
      }

      // Notify other moderators if any
      for (const p of room.getParticipants()) {
        if (p.isModerator() && p.id !== socket.id && p.id !== room.hostId) {
          const modSocket = io.sockets.sockets.get(p.id);
          modSocket?.emit('control_requested', request);
        }
      }

      socket.emit('control_request_sent', {
        message: 'Request sent to the Host! Awaiting approval...',
        requestId: request.requestId,
      });
    } catch (err: any) {
      console.error(`[Error in request_control]:`, err);
    }
  });

  /**
   * Event: respond_control_request (Host/Mod approves or denies control request)
   * Payload: { requestId: string, requesterId: string, approve: boolean, roomId?: string }
   */
  socket.on('respond_control_request', (payload: ControlResponsePayload) => {
    try {
      if (!payload || !payload.requesterId || typeof payload.approve !== 'boolean') return;

      const room = payload.roomId
        ? roomManager.getRoom(payload.roomId)
        : roomManager.getRoomBySocketId(socket.id);

      if (!room) return;

      // Only Host can promote to Moderator
      if (!room.isHost(socket.id)) {
        return rejectAction(
          socket,
          'respond_control_request',
          'Forbidden: Only the Room Host can approve control requests.',
          ['Host']
        );
      }

      const hostParticipant = room.getParticipant(socket.id);
      const targetUser = room.getParticipant(payload.requesterId);

      if (!targetUser) {
        return socket.emit('error_message', { message: 'Target user is no longer in this room.' });
      }

      if (payload.approve) {
        // Promote to Moderator
        const assignResult = room.assignRole(payload.requesterId, 'Moderator', socket.id);
        if (assignResult.success) {
          console.log(
            `[Control Approved] Host ${hostParticipant?.username} approved control for ${targetUser.username}`
          );

          // Broadcast role_assigned to all clients
          io.to(room.id).emit('role_assigned', {
            roomId: room.id,
            userId: targetUser.id,
            username: targetUser.username,
            role: 'Moderator',
            previousRole: assignResult.previousRole,
            assignedBy: hostParticipant?.toJSON(),
            participants: room.getParticipants().map((p) => p.toJSON()),
            message: `${targetUser.username} was promoted to Moderator!`,
          });

          // Update participants list
          io.to(room.id).emit('participants_updated', {
            participants: room.getParticipants().map((p) => p.toJSON()),
            hostId: room.hostId,
          });

          // Direct message to target
          const targetSocket = io.sockets.sockets.get(payload.requesterId);
          targetSocket?.emit('control_request_resolved', {
            approved: true,
            message: '🎉 Your request for playback control was approved! You are now a Moderator.',
          });
        }
      } else {
        console.log(
          `[Control Denied] Host ${hostParticipant?.username} declined control for ${targetUser.username}`
        );

        // Notify requester of denial
        const targetSocket = io.sockets.sockets.get(payload.requesterId);
        targetSocket?.emit('control_request_resolved', {
          approved: false,
          message: 'Your request for playback control was declined by the Host.',
        });
      }
    } catch (err: any) {
      console.error(`[Error in respond_control_request]:`, err);
    }
  });

  /**
   * Event: disconnect
   */
  socket.on('disconnect', (reason: string) => {
    console.log(`[Socket Disconnected] ID: ${socket.id} | Reason: ${reason}`);
    handleLeave(socket);
  });
});

/**
 * Common handler for participant departure (either explicit leave or disconnect)
 */
function handleLeave(socket: Socket, targetRoomId?: string): void {
  const result = roomManager.leaveRoom(socket.id, targetRoomId);
  const { room, participant, newHost, roomDeleted } = result;

  if (!room || !participant) return;

  socket.leave(room.id);

  console.log(
    `[User Left] Room: ${room.id} | User: ${participant.username} | RoomDeleted: ${roomDeleted}`
  );

  if (roomDeleted) {
    console.log(`[Room Closed] Room ${room.id} has been destroyed because all users left.`);
    return;
  }

  // Notify others that participant left
  socket.to(room.id).emit('user_left', {
    userId: participant.id,
    username: participant.username,
    participants: room.getParticipants().map((p) => p.toJSON()),
    participant: participant.toJSON(),
    message: `${participant.username} has left the party.`,
  });

  // If a new host was elected by fallback engine, notify the room
  if (newHost) {
    console.log(`[Host Promoted via Fallback] Room: ${room.id} | New Host: ${newHost.username} (${newHost.id})`);
    io.to(room.id).emit('host_changed', {
      roomId: room.id,
      newHostId: newHost.id,
      newHost: newHost.toJSON(),
      message: `${newHost.username} is now the Host.`,
    });

    io.to(room.id).emit('role_assigned', {
      roomId: room.id,
      userId: newHost.id,
      username: newHost.username,
      role: 'Host',
      participants: room.getParticipants().map((p) => p.toJSON()),
      message: `${newHost.username} was automatically promoted to Host.`,
    });
  }

  // Update participant list for remaining users
  io.to(room.id).emit('participants_updated', {
    participants: room.getParticipants().map((p) => p.toJSON()),
    hostId: room.hostId,
  });
}

// ==========================================
// 5-Second Periodic Computed-Time Heartbeat Loop
// Automatically broadcasts exact computed time to active rooms
// to eliminate drift across clients.
// ==========================================
const HEARTBEAT_INTERVAL_MS = 5000;
const heartbeatTimer = setInterval(() => {
  try {
    const activeRooms = roomManager.getAllRoomsRaw();
    for (const room of activeRooms) {
      if (!room.isEmpty() && room.videoState.videoId && room.videoState.playState === 'playing') {
        io.to(room.id).emit('sync_state', room.getSyncPayload(true));
      }
    }
  } catch (err) {
    console.error('[Heartbeat Error]:', err);
  }
}, HEARTBEAT_INTERVAL_MS);

// Clean up timer on process termination
process.on('SIGINT', () => clearInterval(heartbeatTimer));
process.on('SIGTERM', () => clearInterval(heartbeatTimer));

// ==========================================
// Start Server
// ==========================================

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` YouTube Watch Party Backend Server (RBAC)`);
  console.log(` Running on: http://localhost:${PORT}`);
  console.log(` WebSocket:  ws://localhost:${PORT}`);
  console.log(`=========================================`);
});

// Re-export for modular testing or extensions
export { app, server, io, roomManager, Room, Participant };
