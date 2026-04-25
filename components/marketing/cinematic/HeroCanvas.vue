<template>
  <canvas ref="canvas" class="absolute inset-0 h-full w-full" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'

const canvas = ref<HTMLCanvasElement | null>(null)
let raf = 0
let resizeObs: ResizeObserver | null = null
let particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = []
let reduce = false

const init = () => {
  const c = canvas.value
  if (!c) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const ctx = c.getContext('2d')
  if (!ctx) return

  const sync = () => {
    const rect = c.getBoundingClientRect()
    c.width = Math.floor(rect.width * dpr)
    c.height = Math.floor(rect.height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (particles.length === 0) {
      const count = Math.min(80, Math.max(40, Math.floor(rect.width / 18)))
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          vx: (Math.random() - 0.5) * 0.08,
          vy: -0.05 - Math.random() * 0.12,
          r: Math.random() * 1.4 + 0.3,
          a: Math.random() * 0.5 + 0.2
        })
      }
    }
  }

  resizeObs = new ResizeObserver(sync)
  resizeObs.observe(c)
  sync()

  const tick = () => {
    const rect = c.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)

    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      if (p.y < -10) { p.y = rect.height + 10; p.x = Math.random() * rect.width }
      if (p.x < -10) p.x = rect.width + 10
      if (p.x > rect.width + 10) p.x = -10
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4)
      grad.addColorStop(0, `rgba(198, 244, 50, ${p.a})`)
      grad.addColorStop(1, 'rgba(198, 244, 50, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2)
      ctx.fill()
    }

    if (!reduce) raf = requestAnimationFrame(tick)
  }

  reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduce) raf = requestAnimationFrame(tick)
  else tick()
}

onMounted(() => {
  if (typeof window === 'undefined') return
  init()
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  resizeObs?.disconnect()
  particles = []
})
</script>
