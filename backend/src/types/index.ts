export type ParticipantRole = 'Host' | 'Moderator' | 'Participant' | 'Viewer';

export type VideoPlayState = 'playing' | 'paused' | 'buffering' | 'unstarted' | 'ended' | string;

export interface VideoState {
  videoId: string;
  currentTime: number;
  playState: VideoPlayState;
  lastUpdated: number;
}

export interface ParticipantData {
  id: string;
  username: string;
  role: ParticipantRole;
  joinedAt: number;
}

export interface RoomData {
  id: string;
  hostId: string;
  participants: ParticipantData[];
  videoState: VideoState;
  createdAt: number;
}

export interface JoinRoomPayload {
  roomId: string;
  username: string;
  role?: ParticipantRole;
  isCreator?: boolean;
}

export interface LeaveRoomPayload {
  roomId?: string;
}

export interface PlayPayload {
  roomId?: string;
  currentTime?: number;
}

export interface PausePayload {
  roomId?: string;
  currentTime?: number;
}

export interface SeekPayload {
  roomId?: string;
  currentTime: number;
}

export interface ChangeVideoPayload {
  roomId?: string;
  videoId: string;
}

export interface SyncStatePayload {
  roomId?: string;
  playState: VideoPlayState;
  currentTime: number;
  videoId?: string;
}

export interface AssignRolePayload {
  roomId?: string;
  userId: string;
  role: ParticipantRole;
}

export interface RemoveParticipantPayload {
  roomId?: string;
  userId: string;
}

export interface SendMessagePayload {
  roomId?: string;
  message: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  username: string;
  role: ParticipantRole;
  message: string;
  timestamp: number;
}

export interface ActionRejectedPayload {
  action: string;
  message: string;
  requiredRoles?: ParticipantRole[];
}
