<script setup lang="ts">
import { computed } from 'vue';
import type { Participant, Session, SessionStatus } from '../shared/types';
import StatusPill from './StatusPill.vue';

interface SessionRow {
  key: string;
  id: string;
  session: Session;
  day: string;
  timeRange: string;
  duration: string;
  participantName: string;
  nextStatus: SessionStatus | null;
  actionLabel: string;
  actionText: string;
}

const props = withDefaults(
  defineProps<{
    sessions?: Session[];
    participants?: Participant[];
    busy?: boolean;
  }>(),
  {
    sessions: () => [],
    participants: () => [],
    busy: false,
  },
);

const emit = defineEmits<{
  (event: 'status-change', payload: { id: string; status: SessionStatus }): void;
}>();

const SESSION_STATUSES: SessionStatus[] = ['scheduled', 'in-progress', 'completed', 'cancelled'];

const STATUS_LABELS: Record<SessionStatus, string> = {
  scheduled: 'Scheduled',
  'in-progress': 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const ADVANCE_STATUS: Partial<Record<SessionStatus, SessionStatus>> = {
  scheduled: 'in-progress',
  'in-progress': 'completed',
};

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

function formatDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dayFormatter.format(date);
}

function formatTimeRange(value: string, durationMinutes: number): string {
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return '';
  const startLabel = timeFormatter.format(start);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return startLabel;
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return `${startLabel} – ${timeFormatter.format(end)}`;
}

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

function resolveParticipantName(participantId: string | undefined): string {
  if (!participantId) return 'Unassigned';
  const match = props.participants.find(
    (participant) =>
      participant.email === participantId ||
      participant.name === participantId ||
      participant.initials === participantId,
  );
  return match ? match.name : 'Unassigned';
}

function nextStatus(status: SessionStatus): SessionStatus | null {
  return ADVANCE_STATUS[status] ?? null;
}

function isSessionStatus(value: string): value is SessionStatus {
  return (SESSION_STATUSES as string[]).includes(value);
}

const rows = computed<SessionRow[]>(() =>
  props.sessions.map((session) => {
    const next = nextStatus(session.status);
    return {
      key: `${session.title}::${session.startsAt}`,
      id: session.title,
      session,
      day: formatDay(session.startsAt),
      timeRange: formatTimeRange(session.startsAt, session.durationMinutes),
      duration: formatDuration(session.durationMinutes),
      participantName: resolveParticipantName(session.participantId),
      nextStatus: next,
      actionLabel: next
        ? next === 'in-progress'
          ? `Start ${session.title}`
          : `Mark ${session.title} as completed`
        : `${session.title} is ${STATUS_LABELS[session.status].toLowerCase()}; no further status changes`,
      actionText:
        next === 'in-progress' ? 'Start' : next === 'completed' ? 'Complete' : 'No next step',
    };
  }),
);

function advance(row: SessionRow): void {
  if (props.busy || row.nextStatus === null) return;
  emit('status-change', { id: row.id, status: row.nextStatus });
}

function setStatus(row: SessionRow, event: Event): void {
  const select = event.target as HTMLSelectElement | null;
  if (!select) return;
  const status = select.value;
  if (!isSessionStatus(status) || status === row.session.status) return;
  emit('status-change', { id: row.id, status });
}
</script>

<template>
  <ul v-if="rows.length > 0" class="session-list">
    <li v-for="row in rows" :key="row.key" class="session-row">
      <div class="session-date">
        <time class="session-day" :datetime="row.session.startsAt">{{ row.day }}</time>
        <span class="session-time">{{ row.timeRange }}</span>
        <span v-if="row.duration" class="session-duration">{{ row.duration }}</span>
      </div>

      <div class="session-info">
        <p class="session-title">{{ row.session.title }}</p>
        <p class="session-meta">
          <span class="session-format">{{ row.session.format }}</span>
          <span class="session-participant">{{ row.participantName }}</span>
          <span class="session-moderator">Moderator: {{ row.session.moderator }}</span>
          <span class="session-location">{{ row.session.location }}</span>
        </p>
      </div>

      <div class="session-status">
        <StatusPill :status="row.session.status" />
      </div>

      <div class="session-actions">
        <button
          type="button"
          class="session-action"
          :disabled="busy || row.nextStatus === null"
          :title="row.actionLabel"
          :aria-label="row.actionLabel"
          @click="advance(row)"
        >
          {{ row.actionText }}
        </button>
        <select
          class="session-status-select"
          :value="row.session.status"
          :disabled="busy"
          :aria-label="`Set status for ${row.session.title}`"
          @change="setStatus(row, $event)"
        >
          <option v-for="option in SESSION_STATUSES" :key="option" :value="option">
            {{ STATUS_LABELS[option] }}
          </option>
        </select>
      </div>
    </li>
  </ul>

  <p v-else class="session-list-empty">No sessions scheduled yet.</p>
</template>
