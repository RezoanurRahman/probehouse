export const STUDY_STATUSES = [
  'planning',
  'recruiting',
  'fieldwork',
  'analysis',
  'complete',
] as const;

export type StudyStatus = (typeof STUDY_STATUSES)[number];

export const PARTICIPANT_STATUSES = [
  'invited',
  'screening',
  'confirmed',
  'completed',
  'declined',
] as const;

export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number];

export const SESSION_STATUSES = ['scheduled', 'in-progress', 'completed', 'cancelled'] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_FORMATS = ['moderated', 'unmoderated', 'diary'] as const;

export type SessionFormat = (typeof SESSION_FORMATS)[number];

export const ACTIVITY_TONES = ['blue', 'green', 'amber', 'purple'] as const;

export type ActivityTone = (typeof ACTIVITY_TONES)[number];

export const ACTIVITY_KINDS = ['study', 'participant', 'session', 'note'] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export interface Study {
  id: string;
  code: string;
  title: string;
  objective: string;
  status: StudyStatus;
  owner: string;
  color: string;
  startedAt: string;
  targetParticipants: number;
  tags: string[];
  createdAt: string;
}

export interface Participant {
  id: string;
  studyId: string;
  name: string;
  initials: string;
  role: string;
  email: string;
  status: ParticipantStatus;
  source: string;
  consented: boolean;
  lastContactAt?: string;
  notes?: string;
}

export interface Session {
  id: string;
  studyId: string;
  participantId?: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  format: SessionFormat;
  status: SessionStatus;
  moderator: string;
  location: string;
  notes?: string;
}

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  message: string;
  timestamp: string;
  tone: ActivityTone;
}

export interface DashboardStats {
  activeStudies: number;
  readyParticipants: number;
  upcomingSessions: number;
  followUpsDue: number;
}

export interface DashboardData {
  stats: DashboardStats;
  studies: Study[];
  participants: Participant[];
  sessions: Session[];
  activity: ActivityItem[];
}

export interface StudyDetail {
  study: Study;
  participants: Participant[];
  sessions: Session[];
  activity: ActivityItem[];
}

export interface CreateStudyInput {
  title: string;
  objective: string;
  owner: string;
  targetParticipants: number;
  tags?: string[];
}

export interface UpdateStudyInput {
  title?: string;
  objective?: string;
  status?: StudyStatus;
}

export interface UpdateParticipantInput {
  status?: ParticipantStatus;
  consented?: boolean;
  notes?: string;
}

export interface UpdateSessionInput {
  status?: SessionStatus;
  notes?: string;
}
