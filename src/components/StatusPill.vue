<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ status: string }>();

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planning',
  recruiting: 'Recruiting',
  fieldwork: 'Fieldwork',
  analysis: 'Analysis',
  complete: 'Complete',
  invited: 'Invited',
  screening: 'Screening',
  confirmed: 'Confirmed',
  completed: 'Completed',
  declined: 'Declined',
  scheduled: 'Scheduled',
  'in-progress': 'In progress',
  cancelled: 'Cancelled',
  canceled: 'Canceled',
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
  draft: 'Draft',
};

const statusSlug = computed(() => {
  const normalized = String(props.status ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'unknown';
});

const statusLabel = computed(() => {
  const known = STATUS_LABELS[statusSlug.value];
  if (known) return known;

  return statusSlug.value
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
});
</script>

<template>
  <span class="status-pill" :class="`status-pill--${statusSlug}`">{{ statusLabel }}</span>
</template>
