<script setup lang="ts">
import { computed } from 'vue';
import type { Participant, ParticipantStatus } from '../shared/types';
import StatusPill from './StatusPill.vue';

interface ParticipantRow {
  participant: Participant;
  id: string;
  nextStatus: ParticipantStatus | null;
  advanceLabel: string;
  advanceText: string;
  consentLabel: string;
  consentIcon: string;
}

const props = withDefaults(
  defineProps<{
    participants?: Participant[];
    busy?: boolean;
  }>(),
  {
    participants: () => [],
    busy: false,
  },
);

const emit = defineEmits<{
  (event: 'status-change', payload: { id: string; status: ParticipantStatus }): void;
}>();

const PARTICIPANT_STATUSES: ParticipantStatus[] = [
  'invited',
  'screening',
  'confirmed',
  'completed',
  'declined',
];

const STATUS_LABELS: Record<ParticipantStatus, string> = {
  invited: 'Invited',
  screening: 'Screening',
  confirmed: 'Confirmed',
  completed: 'Completed',
  declined: 'Declined',
};

const ADVANCE_STATUS: Partial<Record<ParticipantStatus, ParticipantStatus>> = {
  invited: 'screening',
  screening: 'confirmed',
  confirmed: 'completed',
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

function participantId(participant: Participant): string {
  return participant.email;
}

function nextStatus(status: ParticipantStatus): ParticipantStatus | null {
  return ADVANCE_STATUS[status] ?? null;
}

function isParticipantStatus(value: string): value is ParticipantStatus {
  return (PARTICIPANT_STATUSES as string[]).includes(value);
}

const rows = computed<ParticipantRow[]>(() =>
  props.participants.map((participant) => {
    const next = nextStatus(participant.status);
    return {
      participant,
      id: participantId(participant),
      nextStatus: next,
      advanceLabel: next
        ? `Advance ${participant.name} to ${STATUS_LABELS[next]}`
        : `${participant.name} is ${STATUS_LABELS[participant.status].toLowerCase()}; no further status changes`,
      advanceText: next ? `Advance to ${STATUS_LABELS[next]}` : 'No next step',
      consentLabel: participant.consented ? 'Consent on file' : 'Consent pending',
      consentIcon: participant.consented ? '✓' : '–',
    };
  }),
);

function advance(row: ParticipantRow): void {
  if (props.busy || row.nextStatus === null) return;
  emit('status-change', { id: row.id, status: row.nextStatus });
}

function setStatus(row: ParticipantRow, event: Event): void {
  const select = event.target as HTMLSelectElement | null;
  if (!select) return;
  const status = select.value;
  if (!isParticipantStatus(status) || status === row.participant.status) return;
  emit('status-change', { id: row.id, status });
}
</script>

<template>
  <ul v-if="rows.length > 0" class="participant-list">
    <li v-for="row in rows" :key="row.id" class="participant-row">
      <span class="participant-avatar" aria-hidden="true">{{ row.participant.initials }}</span>

      <div class="participant-info">
        <p class="participant-name">{{ row.participant.name }}</p>
        <p class="participant-meta">
          <span class="participant-role">{{ row.participant.role }}</span>
          <span class="participant-source">via {{ row.participant.source }}</span>
        </p>
        <p class="participant-contact">
          <span class="participant-email">{{ row.participant.email }}</span>
          <span v-if="row.participant.lastContactAt" class="participant-last-contact">
            Last contact {{ formatDate(row.participant.lastContactAt) }}
          </span>
        </p>
        <p v-if="row.participant.notes" class="participant-note">{{ row.participant.notes }}</p>
      </div>

      <div class="participant-status">
        <span
          class="consent-mark"
          :class="row.participant.consented ? 'consent-mark--yes' : 'consent-mark--no'"
        >
          <span class="consent-icon" aria-hidden="true">{{ row.consentIcon }}</span>
          <span class="consent-text">{{ row.consentLabel }}</span>
        </span>
        <StatusPill :status="row.participant.status" />
      </div>

      <div class="participant-actions">
        <button
          type="button"
          class="advance-button"
          :disabled="busy || row.nextStatus === null"
          :title="row.advanceLabel"
          :aria-label="row.advanceLabel"
          @click="advance(row)"
        >
          {{ row.advanceText }}
        </button>
        <select
          class="participant-status-select"
          :value="row.participant.status"
          :disabled="busy"
          :aria-label="`Set status for ${row.participant.name}`"
          @change="setStatus(row, $event)"
        >
          <option v-for="option in PARTICIPANT_STATUSES" :key="option" :value="option">
            {{ STATUS_LABELS[option] }}
          </option>
        </select>
      </div>
    </li>
  </ul>

  <p v-else class="participant-list-empty">
    No participants yet. Invite someone to start building the panel.
  </p>
</template>
