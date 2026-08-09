<template>
  <span v-if="active" class="destockage-badge" :title="t('admin.pages.orders.badges.destockage')">
    <Icon name="lucide:flame" class="w-3 h-3" />
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
  color: #f97316;
  background: rgba(249, 115, 22, 0.12);
  border: 1px solid rgba(249, 115, 22, 0.35);
}
</style>
