<template>
  <div data-tour="sidebar-tour-menu" class="shrink-0 px-2 pb-1">
    <!-- Collapsed: icon button only -->
    <button
      v-if="!sidebarOpen"
      type="button"
      class="w-full flex items-center justify-center p-2 rounded-lg transition-colors"
      style="color: var(--text-muted)"
      :title="t('admin.tours.menuLabel')"
      @mouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'"
      @mouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'"
      @click="open = !open"
    >
      <Icon name="lucide:help-circle" class="w-[18px] h-[18px]" />
    </button>

    <!-- Expanded: label + chevron -->
    <button
      v-else
      type="button"
      class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-start"
      style="color: var(--text-muted)"
      @mouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'"
      @mouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'"
      @click="open = !open"
    >
      <Icon name="lucide:help-circle" class="w-4 h-4 shrink-0" />
      <span class="text-[12px] font-medium flex-1 truncate">{{ t('admin.tours.menuLabel') }}</span>
      <Icon :name="open ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="w-3.5 h-3.5 shrink-0" />
    </button>

    <!-- Tour list (expanded sidebar only) -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div v-if="open && sidebarOpen" class="mt-1 space-y-px">
        <button
          v-for="tour in tours"
          :key="tour.id"
          type="button"
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-start transition-colors group"
          style="color: var(--text-secondary)"
          @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }"
          @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }"
          @click="launch(tour.id)"
        >
          <Icon :name="tour.icon" class="w-3.5 h-3.5 shrink-0" />
          <span class="text-[11.5px] flex-1 truncate">{{ tour.label }}</span>
          <Icon name="lucide:play" class="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style="color: var(--brand)" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ sidebarOpen: boolean }>()

const { t } = useI18n({ useScope: 'global' })
const { tours, startTour } = useTour()

const open = ref(false)

function launch(id: string) {
  open.value = false
  startTour(id, { force: true })
}

watch(() => props.sidebarOpen, (val) => {
  if (!val) open.value = false
})
</script>
