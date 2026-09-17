import { Participant } from './Participant';
import { ParticipantRole, RoomData, VideoState } from '../types';

export class Room {
  private _id: string;
  private _hostId: string;
  private _participants: Map<string, Participant>;
  private _videoState: VideoState;
  private _createdAt: number;

  constructor(id: string, initialVideoId: string = 'dQw4w9WgXcQ') {
    this._id = id;
    this._hostId = '';
    this._participants = new Map<string, Participant>();
    this._createdAt = Date.now();
    this._videoState = {
      videoId: initialVideoId,
      currentTime: 0,
      playState: 'paused',
      lastUpdated: Date.now(),
    };
  }

  get id(): string {
    return this._id;
  }

  get hostId(): string {
    return this._hostId;
  }

  get createdAt(): number {
    return this._createdAt;
  }

  get videoState(): VideoState {
    return { ...this._videoState };
  }

  /**
   * Adds a participant to the room.
   * If this is the first participant or no host is set, assigns them as 'Host'.
   */
  addParticipant(participant: Participant): void {
    if (this._participants.size === 0 || !this._hostId) {
      participant.setRole('Host');
      this._hostId = participant.id;
    } else {
      participant.setRole('Participant');
    }
    this._participants.set(participant.id, participant);
  }

  /**
   * Removes a participant by socket ID.
   */
  removeParticipant(socketId: string): Participant | undefined {
    const participant = this._participants.get(socketId);
    if (!participant) return undefined;

    this._participants.delete(socketId);
    return participant;
  }

  /**
   * Gets a specific participant by socket ID.
   */
  getParticipant(socketId: string): Participant | undefined {
    return this._participants.get(socketId);
  }

  /**
   * Returns an array of all participants in the room.
   */
  getParticipants(): Participant[] {
    return Array.from(this._participants.values());
  }

  /**
   * Returns participant count.
   */
  getParticipantCount(): number {
    return this._participants.size;
  }

  /**
   * Checks if the room has no active participants.
   */
  isEmpty(): boolean {
    return this._participants.size === 0;
  }

  /**
   * Checks if a socket ID belongs to the current host.
   */
  isHost(socketId: string): boolean {
    return this._hostId === socketId;
  }

  /**
   * RBAC check: Can user control playback (play, pause, seek)?
   * Allowed: Host, Moderator
   */
  canControlPlayback(socketId: string): boolean {
    const participant = this.getParticipant(socketId);
    return !!participant && participant.canControlPlayback();
  }

  /**
   * RBAC check: Can user change video?
   * Allowed: Host, Moderator
   */
  canChangeVideo(socketId: string): boolean {
    const participant = this.getParticipant(socketId);
    return !!participant && participant.canChangeVideo();
  }

  /**
   * RBAC check: Can user perform administrative room actions (assign roles, remove users)?
   * Allowed: Host
   */
  canManageRoom(socketId: string): boolean {
    const participant = this.getParticipant(socketId);
    return !!participant && participant.isHost();
  }

  /**
   * Assigns a role to a participant in the room.
   * Only the Host can assign roles.
   */
  assignRole(
    targetUserId: string,
    newRole: ParticipantRole,
    requesterSocketId: string
  ): {
    success: boolean;
    error?: string;
    targetParticipant?: Participant;
    previousRole?: ParticipantRole;
    hostTransferred?: boolean;
  } {
    if (!this.isHost(requesterSocketId)) {
      return {
        success: false,
        error: 'Forbidden: Only the Host can assign roles.',
      };
    }

    const target = this.getParticipant(targetUserId);
    if (!target) {
      return {
        success: false,
        error: `User ${targetUserId} not found in this room.`,
      };
    }

    const previousRole = target.role;

    if (newRole === 'Host') {
      // Transfer Host: demote current host to Moderator and promote target to Host
      const currentHost = this.getParticipant(this._hostId);
      if (currentHost && currentHost.id !== target.id) {
        currentHost.setRole('Moderator');
      }
      target.setRole('Host');
      this._hostId = target.id;
      return {
        success: true,
        targetParticipant: target,
        previousRole,
        hostTransferred: true,
      };
    }

    // If attempting to demote the current host without transferring
    if (target.id === this._hostId) {
      return {
        success: false,
        error: 'Cannot change host role directly. Transfer Host role to another user first.',
      };
    }

    target.setRole(newRole);
    return {
      success: true,
      targetParticipant: target,
      previousRole,
      hostTransferred: false,
    };
  }

  /**
   * Removes/kicks a participant from the room.
   * Only the Host can kick participants.
   */
  removeParticipantByHost(
    targetUserId: string,
    requesterSocketId: string
  ): {
    success: boolean;
    error?: string;
    removedParticipant?: Participant;
  } {
    if (!this.isHost(requesterSocketId)) {
      return {
        success: false,
        error: 'Forbidden: Only the Host can remove participants.',
      };
    }

    if (targetUserId === requesterSocketId) {
      return {
        success: false,
        error: 'Host cannot remove themselves with this action. Use leave_room instead.',
      };
    }

    const target = this.getParticipant(targetUserId);
    if (!target) {
      return {
        success: false,
        error: `User ${targetUserId} not found in this room.`,
      };
    }

    this._participants.delete(targetUserId);
    return {
      success: true,
      removedParticipant: target,
    };
  }

  /**
   * Explicitly sets a participant as the room host.
   */
  setHost(socketId: string): boolean {
    const participant = this._participants.get(socketId);
    if (!participant) return false;

    // Reset previous host if exists
    if (this._hostId && this._participants.has(this._hostId)) {
      this._participants.get(this._hostId)?.setRole('Moderator');
    }

    participant.setRole('Host');
    this._hostId = socketId;
    return true;
  }

  /**
   * Automatically promotes the next participant to Host when the current host leaves.
   */
  assignNextHost(): Participant | null {
    if (this.isEmpty()) {
      this._hostId = '';
      return null;
    }

    // Try finding a Moderator first, otherwise first available participant
    const participants = this.getParticipants();
    const moderator = participants.find((p) => p.isModerator());
    const nextHost = moderator || participants[0];

    if (nextHost) {
      nextHost.setRole('Host');
      this._hostId = nextHost.id;
      return nextHost;
    }

    return null;
  }

  /**
   * Updates the playback state of the room.
   */
  updateVideoState(newState: Partial<VideoState>): VideoState {
    this._videoState = {
      ...this._videoState,
      ...newState,
      lastUpdated: Date.now(),
    };
    return this.videoState;
  }

  /**
   * Gets full room snapshot for serialization.
   */
  getState(): RoomData {
    return {
      id: this._id,
      hostId: this._hostId,
      participants: this.getParticipants().map((p) => p.toJSON()),
      videoState: this.videoState,
      createdAt: this._createdAt,
    };
  }

  toJSON(): RoomData {
    return this.getState();
  }
}
