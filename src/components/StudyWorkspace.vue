<script setup lang="ts">
import { computed } from 'vue';
import type { ParticipantStatus, SessionStatus, StudyDetail, StudyStatus } from '../shared/types';
import ActivityFeed from './ActivityFeed.vue';
import ParticipantList from './ParticipantList.vue';
import SessionList from './SessionList.vue';
import StatusPill from './StatusPill.vue';

const props = withDefaults(
  defineProps<{
    detail?: StudyDetail | null;
    busy?: boolean;
  }>(),
  {
    detail: null,
    busy: false,
  },
);

const emit = defineEmits<{
  (event: 'status-change', status: StudyStatus): void;
  (event: 'participant-status-change', payload: { id: string; status: ParticipantStatus }): void;
  (event: 'session-status-change', payload: { id: string; status: SessionStatus }): void;
}>();

const STUDY_STATUSES: StudyStatus[] = [
  'planning',
  'recruiting',
  'fieldwork',
  'analysis',
  'complete',
];

const PARTICIPANT_STATUS_ORDER: ParticipantStatus[] = [
  'invited',
  'screening',
  'confirmed',
  'completed',
  'declined',
];

const STUDY_STATUS_LABELS: Record<StudyStatus, string> = {
  planning: 'Planning',
  recruiting: 'Recruiting',
  fieldwork: 'Fieldwork',
  analysis: 'Analysis',
  complete: 'Complete',
};

const PARTICIPANT_STATUS_LABELS: Record<ParticipantStatus, string> = {
  invited: 'Invited',
  screening: 'Screening',
  confirmed: 'Confirmed',
  completed: 'Completed',
  declined: 'Declined',
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const study = computed(() => props.detail?.study ?? null);
const participants = computed(() => props.detail?.participants ?? []);
const sessions = computed(() => props.detail?.sessions ?? []);
const activity = computed(() => props.detail?.activity ?? []);

const participantCounts = computed(() =>
  PARTICIPANT_STATUS_ORDER.map((status) => ({
    status,
    label: PARTICIPANT_STATUS_LABELS[status],
    count: participants.value.filter((participant) => participant.status === status).length,
  })),
);

const confirmedCount = computed(
  () =>
    participants.value.filter(
      (participant) => participant.status === 'confirmed' || participant.status === 'completed',
    ).length,
);

const participantProgress = computed(() => {
  const target = study.value?.targetParticipants ?? 0;
  if (target <= 0) return 0;
  return Math.min(100, Math.round((confirmedCount.value / target) * 100));
});

const participantProgressText = computed(
  () => `${confirmedCount.value} / ${study.value?.targetParticipants ?? 0}`,
);

const sessionSummary = computed(() => {
  const total = sessions.value.length;
  const completed = sessions.value.filter((session) => session.status === 'completed').length;
  return {
    total,
    completed,
    inProgress: sessions.value.filter((session) => session.status === 'in-progress').length,
    scheduled: sessions.value.filter((session) => session.status === 'scheduled').length,
    cancelled: sessions.value.filter((session) => session.status === 'cancelled').length,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    label: `${completed} / ${total}`,
  };
});

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

function isStudyStatus(value: string): value is StudyStatus {
  return (STUDY_STATUSES as string[]).includes(value);
}

function handleStudyStatusChange(event: Event): void {
  const select = event.target as HTMLSelectElement | null;
  if (!select) return;
  const status = select.value;
  if (!isStudyStatus(status) || status === study.value?.status) return;
  emit('status-change', status);
}

function handleParticipantStatusChange(payload: { id: string; status: ParticipantStatus }): void {
  emit('participant-status-change', payload);
}

function handleSessionStatusChange(payload: { id: string; status: SessionStatus }): void {
  emit('session-status-change', payload);
}
</script>

<template>
  <article v-if="study" class="study-workspace">
    <header class="detail-hero">
      <p class="detail-eyebrow">
        <span
          class="detail-hero-accent"
          :style="{ backgroundColor: study.color }"
          aria-hidden="true"
        ></span>
        {{ study.code }}
      </p>
      <h2 class="detail-title">{{ study.title }}</h2>
      <p class="detail-objective">{{ study.objective }}</p>
      <div class="detail-hero-actions">
        <StatusPill :status="study.status" />
        <label class="detail-status-control">
          <span class="detail-status-label">Study status</span>
          <select
            class="detail-status-select"
            :value="study.status"
            :disabled="busy"
            @change="handleStudyStatusChange"
          >
            <option v-for="option in STUDY_STATUSES" :key="option" :value="option">
              {{ STUDY_STATUS_LABELS[option] }}
            </option>
          </select>
        </label>
      </div>
    </header>

    <dl class="detail-meta">
      <div class="detail-meta-item">
        <dt class="detail-meta-label">Owner</dt>
        <dd class="detail-meta-value">{{ study.owner }}</dd>
      </div>
      <div class="detail-meta-item">
        <dt class="detail-meta-label">Started</dt>
        <dd class="detail-meta-value">
          <time :datetime="study.startedAt">{{ formatDate(study.startedAt) }}</time>
        </dd>
      </div>
      <div class="detail-meta-item">
        <dt class="detail-meta-label">Target</dt>
        <dd class="detail-meta-value">{{ study.targetParticipants }} participants</dd>
      </div>
    </dl>

    <ul v-if="study.tags.length > 0" class="tag-list">
      <li v-for="tag in study.tags" :key="tag" class="tag">{{ tag }}</li>
    </ul>

    <section class="progress-summary" aria-labelledby="study-progress-heading">
      <h3 id="study-progress-heading" class="section-title">Progress</h3>
      <div class="progress-grid">
        <div class="progress-block">
          <div class="progress-heading">
            <span class="progress-label">Confirmed participants</span>
            <span class="progress-value">{{ participantProgressText }}</span>
          </div>
          <div
            class="progress-track"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="participantProgress"
            :aria-valuetext="`${confirmedCount} of ${study.targetParticipants} target participants confirmed`"
            aria-label="Participant confirmation progress"
          >
            <div class="progress-fill" :style="{ width: `${participantProgress}%` }"></div>
          </div>
          <ul class="progress-counts">
            <li v-for="entry in participantCounts" :key="entry.status" class="progress-count">
              <span class="progress-count-value">{{ entry.count }}</span>
              <span class="progress-count-label">{{ entry.label }}</span>
            </li>
          </ul>
        </div>

        <div class="progress-block">
          <div class="progress-heading">
            <span class="progress-label">Sessions completed</span>
            <span class="progress-value">{{ sessionSummary.label }}</span>
          </div>
          <div
            class="progress-track"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="sessionSummary.progress"
            :aria-valuetext="`${sessionSummary.completed} of ${sessionSummary.total} sessions completed`"
            aria-label="Session completion progress"
          >
            <div class="progress-fill" :style="{ width: `${sessionSummary.progress}%` }"></div>
          </div>
          <ul class="progress-counts">
            <li class="progress-count">
              <span class="progress-count-value">{{ sessionSummary.scheduled }}</span>
              <span class="progress-count-label">Scheduled</span>
            </li>
            <li class="progress-count">
              <span class="progress-count-value">{{ sessionSummary.inProgress }}</span>
              <span class="progress-count-label">In progress</span>
            </li>
            <li class="progress-count">
              <span class="progress-count-value">{{ sessionSummary.cancelled }}</span>
              <span class="progress-count-label">Cancelled</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <div class="detail-sections">
      <section class="detail-section" aria-labelledby="participants-heading">
        <h3 id="participants-heading" class="section-title">Participants</h3>
        <ParticipantList
          :participants="participants"
          :busy="busy"
          @status-change="handleParticipantStatusChange"
        />
      </section>

      <section class="detail-section" aria-labelledby="sessions-heading">
        <h3 id="sessions-heading" class="section-title">Sessions</h3>
        <SessionList
          :sessions="sessions"
          :participants="participants"
          :busy="busy"
          @status-change="handleSessionStatusChange"
        />
      </section>
    </div>

    <section class="detail-section" aria-labelledby="activity-heading">
      <h3 id="activity-heading" class="section-title">Activity</h3>
      <ActivityFeed :items="activity" />
    </section>
  </article>

  <section v-else class="study-empty">
    <h2 class="study-empty-title">No study selected</h2>
    <p class="study-empty-text">
      Pick a study from the list to review its participants, sessions, and recent activity.
    </p>
  </section>
</template>

<style scoped>
.detail-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
  gap: 1.25rem;
  align-items: start;
}

.progress-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 1rem;
}

.progress-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.progress-count {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.detail-hero-accent {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 999px;
  vertical-align: baseline;
}

.study-empty {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  padding: 3rem 1.5rem;
  text-align: center;
}
</style>
