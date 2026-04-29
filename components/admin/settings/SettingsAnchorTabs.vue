<template>
  <nav class="anchor-tabs" :class="{ 'is-stuck': isStuck }">
    <div ref="tabsRef" class="anchor-tabs-inner">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="anchor-tab"
        :class="{ 'is-active': activeId === tab.id }"
        @click="onClick(tab.id)"
      >
        <Icon v-if="tab.icon" :name="tab.icon" class="anchor-tab-icon" />
        <span>{{ tab.label }}</span>
      </button>
      <span class="anchor-tab-indicator" :style="indicatorStyle" />
    </div>
  </nav>
</template>

<script setup lang="ts">
interface Tab {
  id: string
  label: string
  icon?: string
}

const props = defineProps<{
  tabs: Tab[]
  activeId: string
}>()

const emit = defineEmits<{ select: [id: string] }>()

const tabsRef = ref<HTMLElement | null>(null)
const isStuck = ref(false)
const indicatorStyle = ref({ left: '0px', width: '0px', opacity: '0' })

function onClick(id: string) {
  emit('select', id)
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function updateIndicator() {
  if (!tabsRef.value) return
  const activeBtn = tabsRef.value.querySelector('.anchor-tab.is-active') as HTMLElement | null
  if (!activeBtn) {
    indicatorStyle.value = { left: '0px', width: '0px', opacity: '0' }
    return
  }
  const containerRect = tabsRef.value.getBoundingClientRect()
  const btnRect = activeBtn.getBoundingClientRect()
  indicatorStyle.value = {
    left: `${btnRect.left - containerRect.left}px`,
    width: `${btnRect.width}px`,
    opacity: '1'
  }
}

watch(() => props.activeId, () => nextTick(updateIndicator))
onMounted(() => {
  nextTick(updateIndicator)
  window.addEventListener('resize', updateIndicator)

  const sentinel = document.createElement('div')
  sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;pointer-events:none;'
  const parent = tabsRef.value?.parentElement
  if (parent) {
    parent.style.position = parent.style.position || 'relative'
    parent.insertBefore(sentinel, parent.firstChild)
    const observer = new IntersectionObserver(
      ([entry]) => {
        isStuck.value = !entry.isIntersecting
      },
      { threshold: [1] }
    )
    observer.observe(sentinel)
    onBeforeUnmount(() => {
      observer.disconnect()
      sentinel.remove()
    })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateIndicator)
})
</script>

<style scoped>
.anchor-tabs {
  position: sticky;
  top: 0;
  z-index: 20;
  margin: -8px -4px 24px;
  padding: 8px 4px;
  transition: background 0.2s ease, backdrop-filter 0.2s ease, box-shadow 0.2s ease;
}

.anchor-tabs.is-stuck {
  background: color-mix(in srgb, var(--admin-content-bg) 86%, transparent);
  backdrop-filter: blur(14px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.anchor-tabs-inner {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--surface-2);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  position: relative;
  overflow-x: auto;
  scrollbar-width: none;
}
.anchor-tabs-inner::-webkit-scrollbar {
  display: none;
}

.anchor-tab {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-tertiary);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.15s ease;
  white-space: nowrap;
}

.anchor-tab:hover {
  color: var(--text-primary);
}

.anchor-tab.is-active {
  color: var(--text-primary);
  font-weight: 600;
}

.anchor-tab-icon {
  width: 14px;
  height: 14px;
}

.anchor-tab-indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  background: var(--surface-3);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  transition: left 0.25s cubic-bezier(0.16, 1, 0.3, 1), width 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
  z-index: 1;
  pointer-events: none;
}
</style>
