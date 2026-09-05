<template>
  <div v-if="isValid && !isExpired" class="flex items-center gap-2">
    <div class="flex items-center p-2.5 shadow-sm border" :class="themeClasses.container">
      <div v-if="showIcon" class="flex items-center justify-center me-2">
        <Icon name="lucide:timer" class="w-5 h-5 animate-pulse" />
      </div>
      <div class="flex items-center font-medium tracking-wide">
        <div v-if="timeLeft.days > 0" class="flex items-center">
          <span class="shrink-0 flex items-center justify-center tabular-nums" :class="themeClasses.number">{{ padCount(timeLeft.days) }}</span>
          <span class="uppercase ms-1 me-1" :class="themeClasses.text || 'text-xs opacity-80'">{{ $t('store.countdown.days') }}</span>
        </div>
        <div class="flex items-center">
          <span class="shrink-0 flex items-center justify-center tabular-nums" :class="themeClasses.number">{{ padCount(timeLeft.hours) }}</span>
          <span :class="themeClasses.separator || 'text-xs uppercase mx-0.5 opacity-80'">:</span>
        </div>
        <div class="flex items-center">
          <span class="shrink-0 flex items-center justify-center tabular-nums" :class="themeClasses.number">{{ padCount(timeLeft.minutes) }}</span>
          <span :class="themeClasses.separator || 'text-xs uppercase mx-0.5 opacity-80'">:</span>
        </div>
        <div class="flex items-center">
          <span class="shrink-0 flex items-center justify-center tabular-nums" :class="themeClasses.number">{{ padCount(timeLeft.seconds) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps<{
  endDate?: string | Date | null
  theme?: 'danger' | 'warning' | 'primary' | 'neutral'
  showIcon?: boolean
}>()

const timeLeft = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 })
const isExpired = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const isValid = computed(() => !!props.endDate)

const themeClasses = computed(() => {
  switch (props.theme) {
    case 'danger':
      return {
        container: 'bg-[#ff4747] border-[#ff4747] text-white rounded-full px-4 py-1.5',
        number: 'bg-white text-[#ff4747] px-1.5 py-0.5 rounded md:rounded-md text-[13px] md:text-sm font-black shadow-sm min-w-[24px] md:min-w-[28px] h-[24px] md:h-[28px]',
        separator: 'text-white font-bold mx-1',
        text: 'text-white font-bold opacity-100 text-[11px] md:text-xs tracking-wider'
      }
    case 'warning':
      return {
        container: 'bg-amber-50 text-amber-600 border-amber-100 rounded-xl gap-1.5',
        number: 'text-xl',
        separator: 'text-xs uppercase opacity-80 mx-0.5',
      }
    case 'primary':
      return {
        container: 'bg-primary-50 text-primary-600 border-primary-100 rounded-xl gap-1.5',
        number: 'text-xl',
        separator: 'text-xs uppercase opacity-80 mx-0.5',
      }
    case 'neutral':
    default:
      return {
        container: 'bg-slate-50 text-slate-800 border-slate-200 rounded-xl gap-1.5',
        number: 'text-xl',
        separator: 'text-xs uppercase opacity-80 mx-0.5',
      }
  }
})

const padCount = (num: number) => num.toString().padStart(2, '0')

const updateTime = () => {
  if (!props.endDate) return

  const end = new Date(props.endDate).getTime()
  const now = new Date().getTime()
  const distance = end - now

  if (distance < 0) {
    isExpired.value = true
    if (timer) clearInterval(timer)
    return
  }

  isExpired.value = false
  timeLeft.value = {
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((distance % (1000 * 60)) / 1000)
  }
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
