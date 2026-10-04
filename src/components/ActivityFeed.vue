<script setup lang="ts">
import { computed } from 'vue';
import type { ActivityItem } from '../shared/types';

const props = defineProps<{ items: ActivityItem[] }>();

const KIND_ICONS: Record<ActivityItem['kind'], string> = {
  study: '▤',
  participant: '◍',
  session: '◷',
  note: '✎',
};

const KIND_LABELS: Record<ActivityItem['kind'], string> = {
  study: 'Study',
  participant: 'Participant',
  session: 'Session',
  note: 'Note',
};

const TONE_CLASSES: Record<string, string> = {
  blue: 'activity-item__icon--blue',
  green: 'activity-item__icon--green',
  amber: 'activity-item__icon--amber',
  purple: 'activity-item__icon--purple',
};

const relativeTimeFormat = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
});
const shortDateFormat = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
});
const fullDateFormat = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function timestampValue(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

const orderedItems = computed(() => {
  const items = Array.isArray(props.items) ? [...props.items] : [];
  return items.sort((a, b) => timestampValue(b.timestamp) - timestampValue(a.timestamp));
});

function kindIcon(kind: ActivityItem['kind']): string {
  return KIND_ICONS[kind] ?? '•';
}

function kindLabel(kind: ActivityItem['kind']): string {
  return KIND_LABELS[kind] ?? 'Update';
}

function toneClass(tone: string): string {
  return TONE_CLASSES[tone] ?? TONE_CLASSES.blue;
}

function relativeTime(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;

  const diffMs = parsed - Date.now();
  if (Math.abs(diffMs) < 45_000) return 'Just now';

  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return relativeTimeFormat.format(minutes, 'minute');

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeTimeFormat.format(hours, 'hour');

  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return relativeTimeFormat.format(days, 'day');

  return shortDateFormat.format(new Date(parsed));
}

function fullTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;

  return fullDateFormat.format(new Date(parsed));
}
</script>

<template>
  <section class="activity-panel" aria-label="Activity feed">
    <header class="activity-panel__header">
      <div class="activity-panel__title">
        <p class="eyebrow">Research log</p>
        <h2 class="section-heading">Activity feed</h2>
      </div>
      <span class="activity-count">{{ items.length }}</span>
    </header>

    <ol v-if="orderedItems.length" class="activity-list">
      <li v-for="item in orderedItems" :key="item.id" class="activity-item">
        <span class="activity-item__icon" :class="toneClass(item.tone)" aria-hidden="true">
          {{ kindIcon(item.kind) }}
        </span>
        <div class="activity-item__body">
          <p class="activity-item__message">{{ item.message }}</p>
          <p class="activity-item__meta">
            <span class="activity-item__kind">{{ kindLabel(item.kind) }}</span>
            <time
              class="activity-item__time"
              :datetime="item.timestamp"
              :title="fullTimestamp(item.timestamp)"
            >
              {{ relativeTime(item.timestamp) }}
            </time>
          </p>
        </div>
      </li>
    </ol>

    <div v-else class="empty-state">
      <p class="empty-state__title">No activity yet</p>
      <p class="empty-state__body">
        Updates to studies, participants, and sessions will show up here.
      </p>
    </div>
  </section>
</template>
