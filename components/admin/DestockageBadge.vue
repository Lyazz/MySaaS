<template>
  <span v-if="active" class="destockage-badge" :title="t('admin.pages.orders.badges.destockage')">
    <Icon name="lucide:flame" class="destockage-badge__icon w-3 h-3" />
    {{ t('admin.pages.orders.badges.destockage') }}
  </span>
</template>

<script setup lang="ts">
interface Props {
  active?: boolean
}

withDefaults(defineProps<Props>(), {
  active: false
})

const { t } = useI18n()
</script>

<style scoped>
.destockage-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 9999px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(120deg, #f97316, #ec4899, #f97316);
  background-size: 200% 100%;
  border: 1px solid rgba(249, 115, 22, 0.35);
  box-shadow: 0 0 0 rgba(249, 115, 22, 0.4);
  animation: destockage-shimmer 2.4s linear infinite, destockage-pulse 1.8s ease-in-out infinite;
}

.destockage-badge__icon {
  animation: destockage-flicker 1.6s ease-in-out infinite;
}

@keyframes destockage-shimmer {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

@keyframes destockage-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.45); }
  50% { box-shadow: 0 0 0 4px rgba(249, 115, 22, 0); }
}

@keyframes destockage-flicker {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.85; }
}

@media (prefers-reduced-motion: reduce) {
  .destockage-badge,
  .destockage-badge__icon {
    animation: none;
  }
}
</style>
