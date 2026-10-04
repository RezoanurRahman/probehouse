import type {
  ActivityItem,
  ActivityTone,
  CreateStudyInput,
  DashboardData,
  Participant,
  ParticipantStatus,
  Session,
  SessionStatus,
  Study,
  StudyDetail,
  StudyStatus,
  UpdateParticipantInput,
  UpdateSessionInput,
  UpdateStudyInput,
} from '../shared/types.js';

export interface Store {
  listStudies(status?: StudyStatus): Study[];
  getStudy(id: string): Study | undefined;
  getStudyDetail(id: string): StudyDetail | undefined;
  getDashboard(): DashboardData;
  listActivity(): ActivityItem[];
  createStudy(input: CreateStudyInput): Study;
  updateStudy(id: string, input: UpdateStudyInput): Study | undefined;
  updateParticipant(id: string, input: UpdateParticipantInput): Participant | undefined;
  updateSession(id: string, input: UpdateSessionInput): Session | undefined;
}

const STUDY_COLORS = ['#2563eb', '#0f766e', '#b45309', '#7c3aed', '#be123c', '#0369a1'] as const;

const SEED_STUDIES: Study[] = [
  {
    id: 'study-1',
    code: 'SYN-214',
    title: 'Sync Checkout Usability Study',
    objective:
      'Evaluate how returning shoppers complete the redesigned checkout flow on mobile and desktop.',
    status: 'recruiting',
    owner: 'Mara Ellison',
    color: '#2563eb',
    startedAt: '2026-09-21',
    targetParticipants: 12,
    tags: ['usability', 'checkout', 'mobile'],
    createdAt: '2026-09-18T09:15:00.000Z',
  },
  {
    id: 'study-2',
    code: 'OPS-118',
    title: 'Operations Console Diaries',
    objective: 'Understand how support leads triage queue handoffs across a typical working week.',
    status: 'fieldwork',
    owner: 'Devon Reyes',
    color: '#0f766e',
    startedAt: '2026-09-14',
    targetParticipants: 8,
    tags: ['diary', 'operations', 'workflow'],
    createdAt: '2026-09-10T13:40:00.000Z',
  },
  {
    id: 'study-3',
    code: 'ONB-042',
    title: 'First-Week Onboarding Interviews',
    objective: 'Map the moments where new admins feel confident or stuck during their first week.',
    status: 'analysis',
    owner: 'Priya Raman',
    color: '#b45309',
    startedAt: '2026-08-31',
    targetParticipants: 10,
    tags: ['interviews', 'onboarding', 'b2b'],
    createdAt: '2026-08-26T10:05:00.000Z',
  },
  {
    id: 'study-4',
    code: 'CRM-309',
    title: 'CRM Renewal Concept Test',
    objective: 'Pressure-test three renewal messaging concepts before the winter campaign ships.',
    status: 'planning',
    owner: 'Jonah Feld',
    color: '#7c3aed',
    startedAt: '2026-10-01',
    targetParticipants: 15,
    tags: ['concept-test', 'renewal', 'messaging'],
    createdAt: '2026-10-01T08:30:00.000Z',
  },
  {
    id: 'study-5',
    code: 'LGY-077',
    title: 'Loyalty Program Pulse Survey',
    objective: 'Measure satisfaction with the refreshed points model and spot drop-off drivers.',
    status: 'complete',
    owner: 'Sofia Nakamura',
    color: '#be123c',
    startedAt: '2026-07-06',
    targetParticipants: 24,
    tags: ['survey', 'loyalty', 'quant'],
    createdAt: '2026-07-02T15:20:00.000Z',
  },
];

const SEED_PARTICIPANTS: Participant[] = [
  {
    id: 'participant-1',
    studyId: 'study-1',
    name: 'Alina Weiss',
    initials: 'AW',
    role: 'Returning shopper',
    email: 'alina.weiss@example.com',
    status: 'confirmed',
    source: 'Retail rewards panel',
    consented: true,
    lastContactAt: '2026-10-02T15:40:00.000Z',
    notes: 'Prefers desktop sessions before noon.',
  },
  {
    id: 'participant-2',
    studyId: 'study-1',
    name: 'Marcus Lee',
    initials: 'ML',
    role: 'Cart abandoner',
    email: 'marcus.lee@example.com',
    status: 'screening',
    source: 'In-app intercept',
    consented: true,
    lastContactAt: '2026-10-01T18:05:00.000Z',
  },
  {
    id: 'participant-3',
    studyId: 'study-1',
    name: 'Tessa Grant',
    initials: 'TG',
    role: 'High-frequency buyer',
    email: 'tessa.grant@example.com',
    status: 'invited',
    source: 'Customer referral',
    consented: false,
    lastContactAt: '2026-09-30T11:20:00.000Z',
    notes: 'Waiting on signed consent form.',
  },
  {
    id: 'participant-4',
    studyId: 'study-2',
    name: 'Noor Haddad',
    initials: 'NH',
    role: 'Support lead',
    email: 'noor.haddad@example.com',
    status: 'completed',
    source: 'Advisory board',
    consented: true,
    lastContactAt: '2026-10-03T09:30:00.000Z',
    notes: 'Strong detail on queue handoff friction.',
  },
  {
    id: 'participant-5',
    studyId: 'study-2',
    name: 'Elliot Barnes',
    initials: 'EB',
    role: 'Operations coordinator',
    email: 'elliot.barnes@example.com',
    status: 'confirmed',
    source: 'Outbound recruiting',
    consented: true,
    lastContactAt: '2026-10-02T13:10:00.000Z',
  },
  {
    id: 'participant-6',
    studyId: 'study-2',
    name: 'Hana Sato',
    initials: 'HS',
    role: 'Warehouse supervisor',
    email: 'hana.sato@example.com',
    status: 'declined',
    source: 'Outbound recruiting',
    consented: false,
    lastContactAt: '2026-09-29T16:45:00.000Z',
    notes: 'Declined because of a peak-week schedule conflict.',
  },
  {
    id: 'participant-7',
    studyId: 'study-3',
    name: 'Diego Alvarez',
    initials: 'DA',
    role: 'New customer',
    email: 'diego.alvarez@example.com',
    status: 'completed',
    source: 'Onboarding survey',
    consented: true,
    lastContactAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'participant-8',
    studyId: 'study-3',
    name: 'Ruth Okafor',
    initials: 'RO',
    role: 'Team admin',
    email: 'ruth.okafor@example.com',
    status: 'confirmed',
    source: 'Product-led signup',
    consented: true,
    lastContactAt: '2026-10-02T08:15:00.000Z',
  },
  {
    id: 'participant-9',
    studyId: 'study-4',
    name: 'Samir Patel',
    initials: 'SP',
    role: 'Renewal owner',
    email: 'samir.patel@example.com',
    status: 'invited',
    source: 'Account list',
    consented: false,
  },
  {
    id: 'participant-10',
    studyId: 'study-5',
    name: 'Grace Lin',
    initials: 'GL',
    role: 'Loyalty member',
    email: 'grace.lin@example.com',
    status: 'completed',
    source: 'Loyalty panel',
    consented: true,
    lastContactAt: '2026-08-14T14:30:00.000Z',
  },
];

const SEED_SESSIONS: Session[] = [
  {
    id: 'session-1',
    studyId: 'study-1',
    participantId: 'participant-1',
    title: 'Checkout think-aloud: Alina',
    startsAt: '2026-10-05T14:00:00.000Z',
    durationMinutes: 60,
    format: 'moderated',
    status: 'scheduled',
    moderator: 'Mara Ellison',
    location: 'Remote - Zoom',
  },
  {
    id: 'session-2',
    studyId: 'study-1',
    participantId: 'participant-2',
    title: 'Checkout think-aloud: Marcus',
    startsAt: '2026-10-06T16:30:00.000Z',
    durationMinutes: 60,
    format: 'moderated',
    status: 'scheduled',
    moderator: 'Mara Ellison',
    location: 'Remote - Zoom',
  },
  {
    id: 'session-3',
    studyId: 'study-2',
    participantId: 'participant-4',
    title: 'Ops diary debrief: Noor',
    startsAt: '2026-10-03T09:00:00.000Z',
    durationMinutes: 45,
    format: 'diary',
    status: 'completed',
    moderator: 'Devon Reyes',
    location: 'Remote - Teams',
  },
  {
    id: 'session-4',
    studyId: 'study-2',
    participantId: 'participant-5',
    title: 'Ops workflow walkthrough: Elliot',
    startsAt: '2026-10-04T15:00:00.000Z',
    durationMinutes: 60,
    format: 'moderated',
    status: 'in-progress',
    moderator: 'Devon Reyes',
    location: 'Remote - Teams',
    notes: 'Moved from 2026-10-02 at the participant request.',
  },
  {
    id: 'session-5',
    studyId: 'study-3',
    participantId: 'participant-7',
    title: 'Onboarding interview: Diego',
    startsAt: '2026-10-01T10:00:00.000Z',
    durationMinutes: 45,
    format: 'moderated',
    status: 'completed',
    moderator: 'Priya Raman',
    location: 'Remote - Zoom',
  },
  {
    id: 'session-6',
    studyId: 'study-3',
    participantId: 'participant-8',
    title: 'Onboarding interview: Ruth',
    startsAt: '2026-10-07T13:00:00.000Z',
    durationMinutes: 45,
    format: 'moderated',
    status: 'scheduled',
    moderator: 'Priya Raman',
    location: 'Remote - Zoom',
  },
  {
    id: 'session-7',
    studyId: 'study-4',
    title: 'Pilot dry run',
    startsAt: '2026-10-08T09:30:00.000Z',
    durationMinutes: 30,
    format: 'unmoderated',
    status: 'scheduled',
    moderator: 'Jonah Feld',
    location: 'Remote - unmoderated',
  },
  {
    id: 'session-8',
    studyId: 'study-5',
    participantId: 'participant-10',
    title: 'Loyalty debrief: Grace',
    startsAt: '2026-08-14T14:00:00.000Z',
    durationMinutes: 30,
    format: 'moderated',
    status: 'cancelled',
    moderator: 'Sofia Nakamura',
    location: 'Remote - Zoom',
    notes: 'Cancelled after the participant travelled; the survey wave covered the topic.',
  },
];

interface ActivityRecord {
  item: ActivityItem;
  studyId?: string;
}

const SEED_ACTIVITY: ActivityRecord[] = [
  {
    studyId: 'study-2',
    item: {
      id: 'activity-1',
      kind: 'session',
      message: 'Session moved to in progress: Ops workflow walkthrough: Elliot',
      timestamp: '2026-10-04T15:02:00.000Z',
      tone: 'purple',
    },
  },
  {
    studyId: 'study-2',
    item: {
      id: 'activity-2',
      kind: 'participant',
      message: 'Noor Haddad completed their diary debrief for OPS-118',
      timestamp: '2026-10-03T09:48:00.000Z',
      tone: 'green',
    },
  },
  {
    studyId: 'study-1',
    item: {
      id: 'activity-3',
      kind: 'note',
      message: 'Alina Weiss confirmed: prefers desktop sessions before noon',
      timestamp: '2026-10-02T15:45:00.000Z',
      tone: 'amber',
    },
  },
  {
    studyId: 'study-3',
    item: {
      id: 'activity-4',
      kind: 'session',
      message: 'Session scheduled: Onboarding interview: Ruth on 7 Oct',
      timestamp: '2026-10-02T11:15:00.000Z',
      tone: 'blue',
    },
  },
  {
    studyId: 'study-3',
    item: {
      id: 'activity-5',
      kind: 'participant',
      message: 'Diego Alvarez completed the onboarding interview',
      timestamp: '2026-10-01T10:52:00.000Z',
      tone: 'green',
    },
  },
  {
    studyId: 'study-4',
    item: {
      id: 'activity-6',
      kind: 'study',
      message: 'CRM Renewal Concept Test created with 15 target participants',
      timestamp: '2026-10-01T08:30:00.000Z',
      tone: 'blue',
    },
  },
  {
    studyId: 'study-1',
    item: {
      id: 'activity-7',
      kind: 'participant',
      message: 'Tessa Grant invited to SYN-214 from customer referral',
      timestamp: '2026-09-30T11:20:00.000Z',
      tone: 'blue',
    },
  },
  {
    studyId: 'study-2',
    item: {
      id: 'activity-8',
      kind: 'participant',
      message: 'Hana Sato declined recruitment for OPS-118',
      timestamp: '2026-09-29T16:50:00.000Z',
      tone: 'amber',
    },
  },
  {
    studyId: 'study-5',
    item: {
      id: 'activity-9',
      kind: 'study',
      message: 'Loyalty Program Pulse Survey marked complete',
      timestamp: '2026-09-26T16:20:00.000Z',
      tone: 'purple',
    },
  },
  {
    studyId: 'study-1',
    item: {
      id: 'activity-10',
      kind: 'study',
      message: 'SYN-214 opened recruiting with 12 target participants',
      timestamp: '2026-09-21T09:05:00.000Z',
      tone: 'blue',
    },
  },
  {
    studyId: 'study-2',
    item: {
      id: 'activity-11',
      kind: 'study',
      message: 'OPS-118 moved to fieldwork',
      timestamp: '2026-09-14T08:40:00.000Z',
      tone: 'green',
    },
  },
  {
    item: {
      id: 'activity-12',
      kind: 'note',
      message: 'Weekly recruiting review moved to Thursdays starting next sprint',
      timestamp: '2026-08-25T09:00:00.000Z',
      tone: 'amber',
    },
  },
];

function cloneStudy(study: Study): Study {
  return { ...study, tags: [...study.tags] };
}

function cloneParticipant(participant: Participant): Participant {
  return { ...participant };
}

function cloneSession(session: Session): Session {
  return { ...session };
}

function cloneActivity(item: ActivityItem): ActivityItem {
  return { ...item };
}

function maxSuffix(prefix: string, ids: string[]): number {
  const marker = `${prefix}-`;
  let max = 0;
  for (const id of ids) {
    if (!id.startsWith(marker)) continue;
    const value = Number.parseInt(id.slice(marker.length), 10);
    if (Number.isInteger(value) && value > max) max = value;
  }
  return max;
}

function participantTone(status: ParticipantStatus): ActivityTone {
  if (status === 'confirmed' || status === 'completed') return 'green';
  if (status === 'declined') return 'amber';
  if (status === 'screening') return 'purple';
  return 'blue';
}

function sessionTone(status: SessionStatus): ActivityTone {
  if (status === 'completed') return 'green';
  if (status === 'cancelled') return 'amber';
  if (status === 'in-progress') return 'purple';
  return 'blue';
}

export function createStore(): Store {
  const studies = SEED_STUDIES.map(cloneStudy);
  const participants = SEED_PARTICIPANTS.map(cloneParticipant);
  const sessions = SEED_SESSIONS.map(cloneSession);
  const activity: ActivityRecord[] = SEED_ACTIVITY.map((entry) => ({
    item: cloneActivity(entry.item),
    ...(entry.studyId === undefined ? {} : { studyId: entry.studyId }),
  }));

  let studiesCreated = 0;
  let activityRecorded = maxSuffix(
    'activity',
    activity.map((entry) => entry.item.id),
  );

  const now = (): string => new Date().toISOString();

  const recordActivity = (
    kind: ActivityItem['kind'],
    message: string,
    tone: ActivityTone,
    studyId?: string,
  ): void => {
    activityRecorded += 1;
    const item: ActivityItem = {
      id: `activity-${activityRecorded}`,
      kind,
      message,
      timestamp: now(),
      tone,
    };
    activity.unshift(studyId === undefined ? { item } : { item, studyId });
  };

  const findStudy = (id: string): Study | undefined =>
    studies.find((candidate) => candidate.id === id);

  const codeFor = (studyId: string): string => findStudy(studyId)?.code ?? studyId;

  return {
    listStudies(status?: StudyStatus): Study[] {
      const result =
        status === undefined ? studies : studies.filter((study) => study.status === status);
      return result.map(cloneStudy);
    },

    getStudy(id: string): Study | undefined {
      const study = findStudy(id);
      return study === undefined ? undefined : cloneStudy(study);
    },

    getStudyDetail(id: string): StudyDetail | undefined {
      const study = findStudy(id);
      if (study === undefined) return undefined;
      return {
        study: cloneStudy(study),
        participants: participants
          .filter((participant) => participant.studyId === study.id)
          .map(cloneParticipant),
        sessions: sessions
          .filter((session) => session.studyId === study.id)
          .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
          .map(cloneSession),
        activity: activity
          .filter((entry) => entry.studyId === study.id)
          .map((entry) => cloneActivity(entry.item)),
      };
    },

    getDashboard(): DashboardData {
      return {
        stats: {
          activeStudies: studies.filter((study) => study.status !== 'complete').length,
          readyParticipants: participants.filter(
            (participant) => participant.status === 'confirmed',
          ).length,
          upcomingSessions: sessions.filter((session) => session.status === 'scheduled').length,
          followUpsDue: participants.filter((participant) => participant.status === 'completed')
            .length,
        },
        studies: studies.map(cloneStudy),
        participants: participants.map(cloneParticipant),
        sessions: sessions
          .slice()
          .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
          .map(cloneSession),
        activity: activity.map((entry) => cloneActivity(entry.item)),
      };
    },

    listActivity(): ActivityItem[] {
      return activity.map((entry) => cloneActivity(entry.item));
    },

    createStudy(input: CreateStudyInput): Study {
      studiesCreated += 1;
      const sequence =
        maxSuffix(
          'study',
          studies.map((study) => study.id),
        ) + 1;
      const study: Study = {
        id: `study-${sequence}`,
        code: `NEW-${String(studiesCreated).padStart(2, '0')}`,
        title: input.title.trim(),
        objective: input.objective.trim(),
        status: 'planning',
        owner: input.owner.trim(),
        color: STUDY_COLORS[studiesCreated % STUDY_COLORS.length] ?? STUDY_COLORS[0],
        startedAt: now().slice(0, 10),
        targetParticipants: input.targetParticipants,
        tags:
          input.tags === undefined
            ? []
            : input.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
        createdAt: now(),
      };
      studies.push(study);
      recordActivity('study', `Study created: ${study.title} (${study.code})`, 'blue', study.id);
      return cloneStudy(study);
    },

    updateStudy(id: string, input: UpdateStudyInput): Study | undefined {
      const study = findStudy(id);
      if (study === undefined) return undefined;
      const changes: string[] = [];
      if (input.title !== undefined && input.title !== study.title) {
        study.title = input.title.trim();
        changes.push(`title renamed to "${study.title}"`);
      }
      if (input.objective !== undefined && input.objective !== study.objective) {
        study.objective = input.objective.trim();
        changes.push('objective updated');
      }
      if (input.status !== undefined && input.status !== study.status) {
        study.status = input.status;
        changes.push(`status moved to ${study.status}`);
      }
      if (changes.length > 0) {
        recordActivity(
          'study',
          `Study updated: ${study.code} - ${changes.join('; ')}`,
          input.status === undefined ? 'blue' : 'purple',
          study.id,
        );
      }
      return cloneStudy(study);
    },

    updateParticipant(id: string, input: UpdateParticipantInput): Participant | undefined {
      const participant = participants.find((candidate) => candidate.id === id);
      if (participant === undefined) return undefined;
      const changes: string[] = [];
      if (input.status !== undefined && input.status !== participant.status) {
        participant.status = input.status;
        changes.push(`status moved to ${participant.status}`);
      }
      if (input.consented !== undefined && input.consented !== participant.consented) {
        participant.consented = input.consented;
        changes.push(participant.consented ? 'consent recorded' : 'consent withdrawn');
      }
      if (input.notes !== undefined && input.notes !== participant.notes) {
        participant.notes = input.notes;
        changes.push('notes updated');
      }
      if (changes.length > 0) {
        participant.lastContactAt = now();
        recordActivity(
          'participant',
          `Participant updated: ${participant.name} (${codeFor(
            participant.studyId,
          )}) - ${changes.join('; ')}`,
          participantTone(participant.status),
          participant.studyId,
        );
      }
      return cloneParticipant(participant);
    },

    updateSession(id: string, input: UpdateSessionInput): Session | undefined {
      const session = sessions.find((candidate) => candidate.id === id);
      if (session === undefined) return undefined;
      const changes: string[] = [];
      if (input.status !== undefined && input.status !== session.status) {
        session.status = input.status;
        changes.push(`status moved to ${session.status}`);
      }
      if (input.notes !== undefined && input.notes !== session.notes) {
        session.notes = input.notes;
        changes.push('notes updated');
      }
      if (changes.length > 0) {
        recordActivity(
          'session',
          `Session updated: ${session.title} - ${changes.join('; ')}`,
          sessionTone(session.status),
          session.studyId,
        );
      }
      return cloneSession(session);
    },
  };
}
