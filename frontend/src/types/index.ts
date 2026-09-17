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

export interface ChatMessage {
  id: string;
  senderId: string;
  username: string;
  role: ParticipantRole;
  message: string;
  timestamp: number;
}

export interface NotificationToast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

export interface SyncStatePayload {
  roomId?: string;
  playState: VideoPlayState;
  currentTime: number;
  videoId?: string;
  lastUpdated?: number;
  triggeredBy?: ParticipantData;
}

export interface RoleAssignedPayload {
  roomId: string;
  userId: string;
  username: string;
  role: ParticipantRole;
  previousRole?: ParticipantRole;
  hostTransferred?: boolean;
  assignedBy?: ParticipantData;
  message: string;
}

export interface ParticipantRemovedPayload {
  roomId: string;
  userId: string;
  username: string;
  removedBy?: ParticipantData;
  message: string;
}

export interface HostChangedPayload {
  roomId: string;
  newHostId: string;
  newHost: ParticipantData;
  message: string;
}
