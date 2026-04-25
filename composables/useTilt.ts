import { ref, onMounted, onBeforeUnmount } from 'vue'

interface TiltOptions {
  max?: number
  scale?: number
  glare?: boolean
}

export function useTilt(options: TiltOptions = {}) {
  const { max = 8, scale = 1.01 } = options
  const el = ref<HTMLElement | null>(null)
  const reduceMotion = ref(false)
  let mq: MediaQueryList | null = null

  const onMove = (e: MouseEvent) => {
    if (reduceMotion.value || !el.value) return
    const rect = el.value.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rx = (0.5 - y) * max
    const ry = (x - 0.5) * max
    el.value.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`
    el.value.style.setProperty('--mx', `${x * 100}%`)
    el.value.style.setProperty('--my', `${y * 100}%`)
  }

  const onLeave = () => {
    if (!el.value) return
    el.value.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)'
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduceMotion.value = mq.matches
    const onMqChange = (e: MediaQueryListEvent) => { reduceMotion.value = e.matches }
    mq.addEventListener('change', onMqChange)
    if (el.value) {
      el.value.style.transition = 'transform 0.4s cubic-bezier(.2,.8,.2,1)'
      el.value.addEventListener('mousemove', onMove)
      el.value.addEventListener('mouseleave', onLeave)
    }
  })

  onBeforeUnmount(() => {
    if (el.value) {
      el.value.removeEventListener('mousemove', onMove)
      el.value.removeEventListener('mouseleave', onLeave)
    }
  })

  return { el }
}
