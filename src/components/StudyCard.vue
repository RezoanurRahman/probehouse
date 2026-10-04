<script setup lang="ts">
import { computed } from 'vue';
import StatusPill from './StatusPill.vue';
import type { Study } from '../shared/types';

const props = defineProps<{
  study: Study;
  participantCount: number;
  sessionCount: number;
  selected: boolean;
}>();

const emit = defineEmits<{ select: [] }>();

const target = computed(() => Math.max(Number(props.study.targetParticipants) || 0, 0));

const progressPercent = computed(() => {
  if (target.value <= 0) return 0;

  return Math.min(100, Math.max(0, Math.round((props.participantCount / target.value) * 100)));
});

const studyAccent = computed(() => props.study.color || 'var(--indigo)');

const participantLabel = computed(
  () =>
    `${props.participantCount} ${props.participantCount === 1 ? 'participant' : 'participants'}`,
);

const sessionLabel = computed(
  () => `${props.sessionCount} ${props.sessionCount === 1 ? 'session' : 'sessions'}`,
);
</script>

<template>
  <button
    type="button"
    class="study-card"
    :class="{ 'study-card--selected': selected }"
    :style="{ '--study-accent': studyAccent }"
    :aria-pressed="selected"
    :aria-label="`Select ${study.code}: ${study.title}`"
    @click="emit('select')"
  >
    <span class="study-card__accent" aria-hidden="true"></span>
    <span class="study-card__topline">
      <span class="study-card__code">{{ study.code }}</span>
      <StatusPill :status="study.status" />
    </span>
    <span class="study-card__title">{{ study.title }}</span>
    <span class="study-card__objective" :title="study.objective">{{ study.objective }}</span>
    <span class="study-card__meta">
      <span class="study-card__owner">{{ study.owner }}</span>
      <span class="study-card__count">{{ participantLabel }}</span>
      <span class="study-card__count">{{ sessionLabel }}</span>
    </span>
    <span class="study-card__progress">
      <span class="study-card__progress-label">
        {{ participantCount }} / {{ target }} participants
      </span>
      <span class="progress-track" aria-hidden="true">
        <span class="progress-fill" :style="{ width: `${progressPercent}%` }"></span>
      </span>
    </span>
  </button>
</template>
