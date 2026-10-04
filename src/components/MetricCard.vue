<script setup lang="ts">
import { computed } from 'vue';

type MetricTone = 'blue' | 'green' | 'amber' | 'purple';

const props = defineProps<{
  label: string;
  value: string | number;
  detail: string;
  icon: string;
  tone: MetricTone;
}>();

const displayValue = computed(() =>
  typeof props.value === 'number' ? props.value.toLocaleString('en-US') : props.value,
);
</script>

<template>
  <article class="metric-card" :class="`metric-card--${tone}`">
    <span class="metric-icon" :class="`metric-icon--${tone}`" aria-hidden="true">{{ icon }}</span>
    <div class="metric-body">
      <p class="metric-value">{{ displayValue }}</p>
      <p class="metric-label">{{ label }}</p>
      <p class="metric-detail">{{ detail }}</p>
    </div>
  </article>
</template>
