import { ParticipantRole, ParticipantData } from '../types';

export class Participant {
  private _id: string;
  private _username: string;
  private _role: ParticipantRole;
  private _joinedAt: number;

  constructor(id: string, username: string, role: ParticipantRole = 'Participant') {
    this._id = id;
    this._username = username.trim() || `User_${id.substring(0, 4)}`;
    this._role = role;
    this._joinedAt = Date.now();
  }

  get id(): string {
    return this._id;
  }

  get username(): string {
    return this._username;
  }

  set username(name: string) {
    this._username = name.trim() || this._username;
  }

  get role(): ParticipantRole {
    return this._role;
  }

  setRole(role: ParticipantRole): void {
    this._role = role;
  }

  get joinedAt(): number {
    return this._joinedAt;
  }

  // RBAC Permission Checkers
  isHost(): boolean {
    return this._role === 'Host';
  }

  isModerator(): boolean {
    return this._role === 'Moderator';
  }

  canControlPlayback(): boolean {
    return this._role === 'Host' || this._role === 'Moderator';
  }

  canChangeVideo(): boolean {
    return this._role === 'Host' || this._role === 'Moderator';
  }

  canAssignRoles(): boolean {
    return this._role === 'Host';
  }

  canRemoveParticipants(): boolean {
    return this._role === 'Host';
  }

  canTransferHost(): boolean {
    return this._role === 'Host';
  }

  toJSON(): ParticipantData {
    return {
      id: this._id,
      username: this._username,
      role: this._role,
      joinedAt: this._joinedAt,
    };
  }
}
