<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import ActivityFeed from './components/ActivityFeed.vue';
import MetricCard from './components/MetricCard.vue';
import StatusPill from './components/StatusPill.vue';
import StudyCard from './components/StudyCard.vue';
import StudyWorkspace from './components/StudyWorkspace.vue';
import {
  createStudy,
  fetchDashboard,
  fetchStudyDetail,
  updateParticipant,
  updateSession,
  updateStudy,
} from './client/api';
import type {
  ActivityItem,
  CreateStudyInput,
  DashboardData,
  Participant,
  ParticipantStatus,
  Session,
  SessionStatus,
  Study,
  StudyDetail,
  StudyStatus,
} from './shared/types';

type StatusFilter = StudyStatus | 'all';
type MetricTone = 'blue' | 'green' | 'amber' | 'purple';

interface StatusFilterOption {
  value: StatusFilter;
  label: string;
}

interface MetricDefinition {
  key: string;
  label: string;
  value: string | number;
  detail: string;
  icon: string;
  tone: MetricTone;
}

interface ParticipantStatusPayload {
  id: string;
  status: ParticipantStatus;
}

interface SessionStatusPayload {
  id: string;
  status: SessionStatus;
}

interface CreateFormState {
  title: string;
  objective: string;
  owner: string;
  targetParticipants: string;
  tags: string;
}

const statusFilters: StatusFilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'planning', label: 'Planning' },
  { value: 'recruiting', label: 'Recruiting' },
  { value: 'fieldwork', label: 'Fieldwork' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'complete', label: 'Complete' },
];

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const dashboard = ref<DashboardData | null>(null);
const dashboardLoading = ref(true);
const dashboardError = ref<string | null>(null);

const searchText = ref('');
const statusFilter = ref<StatusFilter>('all');

const selectedStudyId = ref<string | null>(null);
const detail = ref<StudyDetail | null>(null);
const detailLoading = ref(false);
const detailError = ref<string | null>(null);

const mutationBusy = ref(false);
const actionError = ref<string | null>(null);
const feedback = ref<string | null>(null);

const createOpen = ref(false);
const createSubmitting = ref(false);
const createError = ref<string | null>(null);
const createForm = reactive<CreateFormState>({
  title: '',
  objective: '',
  owner: '',
  targetParticipants: '12',
  tags: '',
});
const createErrors = reactive<Record<string, string>>({});

const newStudyButton = ref<HTMLButtonElement | null>(null);
const titleInput = ref<HTMLInputElement | null>(null);
const modalPanel = ref<HTMLDivElement | null>(null);

let detailRequestId = 0;
let feedbackTimer: number | undefined;

const studies = computed<Study[]>(() => dashboard.value?.studies ?? []);
const participants = computed<Participant[]>(() => dashboard.value?.participants ?? []);
const sessions = computed<Session[]>(() => dashboard.value?.sessions ?? []);
const activity = computed<ActivityItem[]>(() => dashboard.value?.activity ?? []);
const hasDashboard = computed(() => dashboard.value !== null);

const participantCounts = computed(() => countByStudy(participants.value));
const sessionCounts = computed(() => countByStudy(sessions.value));

const statusCounts = computed<Record<StatusFilter, number>>(() => {
  const counts: Record<StatusFilter, number> = {
    all: studies.value.length,
    planning: 0,
    recruiting: 0,
    fieldwork: 0,
    analysis: 0,
    complete: 0,
  };

  for (const study of studies.value) {
    counts[study.status] += 1;
  }

  return counts;
});

const filteredStudies = computed<Study[]>(() => {
  const query = searchText.value.trim().toLowerCase();

  return studies.value.filter((study) => {
    if (statusFilter.value !== 'all' && study.status !== statusFilter.value) return false;
    if (query === '') return true;

    const haystack = [study.code, study.title, study.objective, study.owner, ...study.tags]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
});

const selectedStudy = computed<Study | null>(
  () => studies.value.find((study) => study.id === selectedStudyId.value) ?? null,
);
const detailStudy = computed<Study | null>(() => detail.value?.study ?? null);
const activeStudy = computed<Study | null>(() => detailStudy.value ?? selectedStudy.value);

const activeParticipantCount = computed(() => {
  if (detail.value !== null) return detail.value.participants.length;
  return activeStudy.value === null ? 0 : participantCountFor(activeStudy.value);
});

const activeSessionCount = computed(() => {
  if (detail.value !== null) return detail.value.sessions.length;
  return activeStudy.value === null ? 0 : sessionCountFor(activeStudy.value);
});

const activeStudyMeta = computed(() => {
  const study = activeStudy.value;
  if (study === null) return '';

  const parts = [
    `${activeParticipantCount.value} ${
      activeParticipantCount.value === 1 ? 'participant' : 'participants'
    }`,
    `${activeSessionCount.value} ${activeSessionCount.value === 1 ? 'session' : 'sessions'}`,
  ];
  const created = formatDate(study.createdAt);
  if (created !== '') parts.push(`Created ${created}`);

  return parts.join(' · ');
});

const metricCards = computed<MetricDefinition[]>(() => {
  const stats = dashboard.value?.stats ?? null;

  return [
    {
      key: 'active-studies',
      label: 'Active studies',
      value: stats === null ? '—' : stats.activeStudies,
      detail: 'Planning, recruiting, or in the field',
      icon: '◎',
      tone: 'blue',
    },
    {
      key: 'ready-participants',
      label: 'Ready participants',
      value: stats === null ? '—' : stats.readyParticipants,
      detail: 'Confirmed and ready for a session',
      icon: '◉',
      tone: 'green',
    },
    {
      key: 'upcoming-sessions',
      label: 'Upcoming sessions',
      value: stats === null ? '—' : stats.upcomingSessions,
      detail: 'Scheduled and waiting on the calendar',
      icon: '◷',
      tone: 'amber',
    },
    {
      key: 'follow-ups-due',
      label: 'Follow-ups due',
      value: stats === null ? '—' : stats.followUpsDue,
      detail: 'Completed participants ready for a nudge',
      icon: '✦',
      tone: 'purple',
    },
  ];
});

const latestActivityAt = computed<string | null>(() => {
  let latest: string | null = null;
  let latestValue = Number.NEGATIVE_INFINITY;

  for (const item of activity.value) {
    const value = Date.parse(item.timestamp);
    if (!Number.isNaN(value) && value > latestValue) {
      latestValue = value;
      latest = item.timestamp;
    }
  }

  return latest;
});

function countByStudy(items: Array<{ studyId: string }>): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item.studyId, (counts.get(item.studyId) ?? 0) + 1);
  }

  return counts;
}

function participantCountFor(study: Study): number {
  const live = detail.value;
  if (live !== null && live.study.id === study.id) return live.participants.length;
  return participantCounts.value.get(study.id) ?? 0;
}

function sessionCountFor(study: Study): number {
  const live = detail.value;
  if (live !== null && live.study.id === study.id) return live.sessions.length;
  return sessionCounts.value.get(study.id) ?? 0;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | null | undefined): string {
  const date = parseDate(value);
  return date === null ? '' : dateFormatter.format(date);
}

function formatDateTime(value: string | null | undefined): string {
  const date = parseDate(value);
  return date === null ? '' : dateTimeFormatter.format(date);
}

function humanize(value: string): string {
  const words = value.replace(/[-_]+/g, ' ').trim();
  if (words === '') return value;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : 'Something went wrong. Please try again.';
}

function flash(message: string): void {
  feedback.value = message;
  if (feedbackTimer !== undefined) window.clearTimeout(feedbackTimer);
  feedbackTimer = window.setTimeout(() => {
    feedback.value = null;
  }, 6000);
}

async function loadDashboard(options: { silent?: boolean } = {}): Promise<void> {
  const silent = options.silent === true;

  if (!silent) {
    dashboardLoading.value = true;
    dashboardError.value = null;
  }

  try {
    dashboard.value = await fetchDashboard();
    dashboardError.value = null;
  } catch (error) {
    const message = messageOf(error);
    if (silent && dashboard.value !== null) actionError.value = message;
    else dashboardError.value = message;
  } finally {
    if (!silent) dashboardLoading.value = false;
  }
}

async function loadDetail(id: string, options: { silent?: boolean } = {}): Promise<void> {
  const silent = options.silent === true;
  detailRequestId += 1;
  const requestId = detailRequestId;

  if (!silent) {
    detailLoading.value = true;
    detailError.value = null;
  }

  try {
    const loaded = await fetchStudyDetail(id);
    if (requestId !== detailRequestId) return;
    detail.value = loaded;
    detailError.value = null;
  } catch (error) {
    if (requestId !== detailRequestId) return;
    const message = messageOf(error);
    if (silent && detail.value !== null) actionError.value = message;
    else detailError.value = message;
  } finally {
    if (requestId === detailRequestId) detailLoading.value = false;
  }
}

async function selectStudy(study: Study): Promise<void> {
  if (selectedStudyId.value === study.id && detail.value !== null) return;

  selectedStudyId.value = study.id;
  detail.value = null;
  detailError.value = null;
  actionError.value = null;
  await loadDetail(study.id);
}

async function refreshDetail(): Promise<void> {
  const id = selectedStudyId.value;
  if (id === null) return;
  await loadDetail(id);
}

async function runMutation(action: () => Promise<unknown>, successMessage: string): Promise<void> {
  if (mutationBusy.value) return;

  mutationBusy.value = true;
  actionError.value = null;

  try {
    await action();
    const studyId = selectedStudyId.value;
    if (studyId !== null) await loadDetail(studyId, { silent: true });
    await loadDashboard({ silent: true });
    flash(successMessage);
  } catch (error) {
    actionError.value = messageOf(error);
  } finally {
    mutationBusy.value = false;
  }
}

async function handleStudyStatusChange(status: StudyStatus): Promise<void> {
  const study = activeStudy.value;
  if (study === null) return;
  await runMutation(
    () => updateStudy(study.id, { status }),
    `Study status updated to ${humanize(status)}.`,
  );
}

async function handleParticipantStatusChange(payload: ParticipantStatusPayload): Promise<void> {
  if (payload.id === '') return;
  await runMutation(
    () => updateParticipant(payload.id, { status: payload.status }),
    `Participant marked ${humanize(payload.status)}.`,
  );
}

async function handleSessionStatusChange(payload: SessionStatusPayload): Promise<void> {
  if (payload.id === '') return;
  await runMutation(
    () => updateSession(payload.id, { status: payload.status }),
    `Session marked ${humanize(payload.status)}.`,
  );
}

function resetFilters(): void {
  searchText.value = '';
  statusFilter.value = 'all';
}

function clearCreateErrors(): void {
  for (const key of Object.keys(createErrors)) delete createErrors[key];
}

function openCreateModal(): void {
  createOpen.value = true;
  createError.value = null;
  clearCreateErrors();
  void nextTick(() => titleInput.value?.focus());
}

function closeCreateModal(): void {
  if (createSubmitting.value) return;

  createOpen.value = false;
  createError.value = null;
  clearCreateErrors();
  void nextTick(() => newStudyButton.value?.focus());
}

function resetCreateForm(): void {
  createForm.title = '';
  createForm.objective = '';
  createForm.owner = '';
  createForm.targetParticipants = '12';
  createForm.tags = '';
}

function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const part of raw.split(',')) {
    const tag = part.trim();
    if (tag === '' || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
  }

  return tags;
}

function validateCreateForm(): CreateStudyInput | null {
  clearCreateErrors();

  const title = createForm.title.trim();
  const objective = createForm.objective.trim();
  const owner = createForm.owner.trim();
  const targetParticipants = Number.parseInt(createForm.targetParticipants, 10);

  if (title.length < 3) createErrors.title = 'Give the study a title of at least 3 characters.';
  if (objective.length < 10) {
    createErrors.objective = 'Describe the objective in at least 10 characters.';
  }
  if (owner === '') createErrors.owner = 'Name the owner who runs this study.';
  if (!Number.isInteger(targetParticipants) || targetParticipants < 1) {
    createErrors.targetParticipants = 'Target at least one participant.';
  } else if (targetParticipants > 10000) {
    createErrors.targetParticipants = 'Keep the target at 10,000 participants or fewer.';
  }

  if (Object.keys(createErrors).length > 0) return null;

  return { title, objective, owner, targetParticipants, tags: parseTags(createForm.tags) };
}

async function submitCreateStudy(): Promise<void> {
  if (createSubmitting.value) return;

  const input = validateCreateForm();
  if (input === null) {
    void nextTick(() => {
      modalPanel.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
    return;
  }

  createSubmitting.value = true;
  createError.value = null;

  try {
    const created = await createStudy(input);
    createOpen.value = false;
    resetCreateForm();
    await loadDashboard({ silent: true });
    void selectStudy(created);
    flash(`Study “${created.title}” created.`);
    void nextTick(() => newStudyButton.value?.focus());
  } catch (error) {
    createError.value = messageOf(error);
  } finally {
    createSubmitting.value = false;
  }
}

function onWindowKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !createOpen.value) return;
  event.preventDefault();
  closeCreateModal();
}

function onModalKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;

  const panel = modalPanel.value;
  if (panel === null) return;

  const focusable = Array.from(
    panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ),
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (first === undefined || last === undefined) return;

  const active = document.activeElement;
  if (event.shiftKey && (active === first || !panel.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onWindowKeydown);
  void loadDashboard();
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown);
  if (feedbackTimer !== undefined) window.clearTimeout(feedbackTimer);
});
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-header__inner">
        <div class="brand-lockup">
          <span class="brand-mark" aria-hidden="true">PH</span>
          <div>
            <h1 class="brand-name">Probehouse</h1>
            <p class="brand-descriptor">
              Research operations desk for studies, participants, and moderated sessions.
            </p>
          </div>
        </div>

        <div class="header-actions">
          <p class="live-indicator" role="status">
            <span class="live-indicator__dot" aria-hidden="true"></span>
            Local workspace
          </p>
          <button
            ref="newStudyButton"
            class="button button--primary"
            type="button"
            @click="openCreateModal"
          >
            New study
          </button>
        </div>
      </div>
    </header>

    <main class="app-main">
      <header class="page-intro">
        <div>
          <p class="eyebrow">Today</p>
          <h2 id="metrics-heading" class="page-title">Research operations at a glance</h2>
        </div>
        <p class="intro-copy">
          Four numbers that keep the desk moving — seeded locally, stored in memory, and updated as
          you work.
        </p>
      </header>

      <section class="metrics-grid" aria-labelledby="metrics-heading">
        <MetricCard
          v-for="metric in metricCards"
          :key="metric.key"
          :label="metric.label"
          :value="metric.value"
          :detail="metric.detail"
          :icon="metric.icon"
          :tone="metric.tone"
        />
      </section>

      <div class="content-grid">
        <aside class="study-sidebar" aria-labelledby="studies-heading">
          <header class="sidebar-header">
            <div class="sidebar-title">
              <div>
                <p class="eyebrow">Pipeline</p>
                <h2 id="studies-heading">Studies</h2>
              </div>
              <span class="count-badge">{{ filteredStudies.length }} / {{ studies.length }}</span>
            </div>

            <label class="search-field" for="study-search">
              <span class="visually-hidden">Search studies</span>
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
                <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.6" />
                <path
                  d="M13.4 13.4 17 17"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
              <input
                id="study-search"
                v-model="searchText"
                type="search"
                name="study-search"
                placeholder="Title, owner, or tag"
                autocomplete="off"
              />
            </label>

            <div class="filter-row" role="group" aria-label="Filter studies by status">
              <button
                v-for="filter in statusFilters"
                :key="filter.value"
                class="filter-chip"
                :class="{ 'is-active': statusFilter === filter.value }"
                type="button"
                :aria-pressed="statusFilter === filter.value"
                @click="statusFilter = filter.value"
              >
                {{ filter.label }}
                <span class="filter-count">{{ statusCounts[filter.value] }}</span>
              </button>
            </div>
          </header>

          <div v-if="dashboardLoading" class="loading-state" role="status">
            <span class="spinner" aria-hidden="true"></span>
            <p class="loading-state__label">Loading studies…</p>
          </div>

          <div v-else-if="dashboardError !== null" class="error-state" role="alert">
            <div>
              <p class="error-state__message">The dashboard could not be loaded.</p>
              <p>{{ dashboardError }}</p>
              <div class="error-state__action">
                <button class="button button--ghost" type="button" @click="loadDashboard()">
                  Try again
                </button>
              </div>
            </div>
          </div>

          <ul v-else-if="filteredStudies.length > 0" class="study-list">
            <li v-for="study in filteredStudies" :key="study.id">
              <StudyCard
                :study="study"
                :participant-count="participantCountFor(study)"
                :session-count="sessionCountFor(study)"
                :selected="study.id === selectedStudyId"
                @select="selectStudy(study)"
              />
            </li>
          </ul>

          <div v-else class="empty-state" role="status">
            <p class="empty-state__title">
              {{ studies.length === 0 ? 'No studies yet' : 'No studies match this view' }}
            </p>
            <p class="empty-state__body">
              {{
                studies.length === 0
                  ? 'Create the first study to start recruiting participants and scheduling sessions.'
                  : 'Try a different search term or reset the status filter to see every study.'
              }}
            </p>
            <div class="empty-state__action">
              <button
                v-if="studies.length > 0"
                class="button button--ghost"
                type="button"
                @click="resetFilters"
              >
                Clear filters
              </button>
              <button v-else class="button button--primary" type="button" @click="openCreateModal">
                Create a study
              </button>
            </div>
          </div>
        </aside>

        <div class="workspace-section">
          <section
            id="study-workspace"
            class="workspace-panel"
            tabindex="-1"
            aria-labelledby="workspace-heading"
          >
            <header class="workspace-header">
              <div>
                <p class="eyebrow">Focus</p>
                <h2 id="workspace-heading" class="section-heading">Study workspace</h2>
                <p v-if="activeStudy !== null" class="intro-copy">{{ activeStudyMeta }}</p>
              </div>
              <div class="header-actions">
                <StatusPill
                  v-if="activeStudy !== null && detail === null"
                  :status="activeStudy.status"
                />
                <button
                  v-if="selectedStudyId !== null"
                  class="button button--ghost"
                  type="button"
                  :disabled="detailLoading || mutationBusy"
                  @click="refreshDetail"
                >
                  {{ detailLoading ? 'Refreshing…' : 'Refresh' }}
                </button>
              </div>
            </header>

            <p v-if="mutationBusy" class="intro-copy" role="status">
              Saving your change and refreshing the workspace…
            </p>

            <div v-if="actionError !== null" class="error-banner" role="alert">
              <span class="error-banner__message">{{ actionError }}</span>
              <button
                class="button button--ghost button--small"
                type="button"
                @click="actionError = null"
              >
                Dismiss
              </button>
            </div>

            <div
              v-if="detailLoading && detail === null"
              class="workspace-section"
              role="status"
              aria-busy="true"
            >
              <span class="skeleton skeleton--block" aria-hidden="true"></span>
              <span class="skeleton" aria-hidden="true"></span>
              <span class="skeleton" aria-hidden="true"></span>
              <p class="loading-state__label">Loading study detail…</p>
            </div>

            <div
              v-else-if="detailError !== null && detail === null"
              class="error-state"
              role="alert"
            >
              <div>
                <p class="error-state__message">This study could not be opened.</p>
                <p>{{ detailError }}</p>
                <div class="error-state__action">
                  <button
                    class="button button--ghost"
                    type="button"
                    :disabled="detailLoading"
                    @click="refreshDetail"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>

            <StudyWorkspace
              v-else-if="detail !== null"
              :detail="detail"
              :busy="mutationBusy"
              @status-change="handleStudyStatusChange"
              @participant-status-change="handleParticipantStatusChange"
              @session-status-change="handleSessionStatusChange"
            />

            <div v-else class="workspace-placeholder">
              <div>
                <p class="empty-state__title">Select a study to open its workspace</p>
                <p class="empty-state__body">
                  Participants, sessions, and follow-ups for the selected study appear here.
                </p>
              </div>
            </div>
          </section>

          <aside class="activity-panel" aria-labelledby="activity-heading">
            <header class="activity-panel__header">
              <div class="activity-panel__title">
                <p class="eyebrow">Timeline</p>
                <h2 id="activity-heading" class="section-heading">Activity</h2>
                <p v-if="latestActivityAt !== null" class="intro-copy">
                  Last update {{ formatDateTime(latestActivityAt) }}
                </p>
              </div>
              <span class="activity-count">{{ activity.length }}</span>
            </header>

            <div v-if="dashboardLoading && !hasDashboard" class="loading-state" role="status">
              <span class="spinner" aria-hidden="true"></span>
              <p class="loading-state__label">Loading activity…</p>
            </div>
            <ActivityFeed v-else :items="activity" />
          </aside>
        </div>
      </div>
    </main>

    <p v-if="feedback !== null" class="toast toast--success" role="status">
      <span class="toast__message">{{ feedback }}</span>
    </p>

    <div v-if="createOpen" class="modal-backdrop" @click.self="closeCreateModal">
      <div
        ref="modalPanel"
        class="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-study-heading"
        @keydown="onModalKeydown"
      >
        <header class="modal-header">
          <div>
            <p class="eyebrow">New record</p>
            <h2 id="new-study-heading" class="modal-title">Start a study</h2>
            <p class="modal-copy">
              New studies open in planning; move them through the pipeline once the team is ready.
            </p>
          </div>
          <button
            class="modal-close button button--ghost button--icon"
            type="button"
            aria-label="Close the new study dialog"
            @click="closeCreateModal"
          >
            ×
          </button>
        </header>

        <form class="modal-form" novalidate @submit.prevent="submitCreateStudy">
          <div class="modal-body">
            <div class="form-grid">
              <div class="field field--full">
                <label class="field__label" for="study-title">Title</label>
                <input
                  id="study-title"
                  ref="titleInput"
                  v-model="createForm.title"
                  type="text"
                  name="title"
                  placeholder="Checkout drop-off interviews"
                  autocomplete="off"
                  :aria-invalid="createErrors.title ? 'true' : undefined"
                  :aria-describedby="createErrors.title ? 'study-title-error' : undefined"
                />
                <p v-if="createErrors.title" id="study-title-error" class="field-error">
                  {{ createErrors.title }}
                </p>
              </div>

              <div class="field field--full">
                <label class="field__label" for="study-objective">Objective</label>
                <textarea
                  id="study-objective"
                  v-model="createForm.objective"
                  name="objective"
                  rows="3"
                  placeholder="What decision should this research inform?"
                  :aria-invalid="createErrors.objective ? 'true' : undefined"
                  :aria-describedby="createErrors.objective ? 'study-objective-error' : undefined"
                ></textarea>
                <p v-if="createErrors.objective" id="study-objective-error" class="field-error">
                  {{ createErrors.objective }}
                </p>
              </div>

              <div class="field">
                <label class="field__label" for="study-owner">Owner</label>
                <input
                  id="study-owner"
                  v-model="createForm.owner"
                  type="text"
                  name="owner"
                  placeholder="Research lead"
                  autocomplete="off"
                  :aria-invalid="createErrors.owner ? 'true' : undefined"
                  :aria-describedby="createErrors.owner ? 'study-owner-error' : undefined"
                />
                <p v-if="createErrors.owner" id="study-owner-error" class="field-error">
                  {{ createErrors.owner }}
                </p>
              </div>

              <div class="field">
                <label class="field__label" for="study-target">Target participants</label>
                <input
                  id="study-target"
                  v-model="createForm.targetParticipants"
                  type="number"
                  name="targetParticipants"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  :aria-invalid="createErrors.targetParticipants ? 'true' : undefined"
                  :aria-describedby="
                    createErrors.targetParticipants ? 'study-target-error' : undefined
                  "
                />
                <p
                  v-if="createErrors.targetParticipants"
                  id="study-target-error"
                  class="field-error"
                >
                  {{ createErrors.targetParticipants }}
                </p>
              </div>

              <div class="field field--full">
                <label class="field__label" for="study-tags">Tags</label>
                <input
                  id="study-tags"
                  v-model="createForm.tags"
                  type="text"
                  name="tags"
                  placeholder="interview, discovery"
                  autocomplete="off"
                />
                <p class="field-hint">Comma separated. Optional.</p>
              </div>
            </div>

            <p v-if="createError !== null" class="error-banner" role="alert">
              <span class="error-banner__message">{{ createError }}</span>
            </p>
          </div>

          <div class="modal-actions">
            <button
              class="button button--ghost"
              type="button"
              :disabled="createSubmitting"
              @click="closeCreateModal"
            >
              Cancel
            </button>
            <button class="button button--primary" type="submit" :disabled="createSubmitting">
              {{ createSubmitting ? 'Creating study…' : 'Create study' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
