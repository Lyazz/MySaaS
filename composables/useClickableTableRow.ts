const interactiveRowTargetSelector =
  'a, button, input, select, textarea, label, summary, [role="button"], [data-row-click-ignore]'

// Mobile browsers/WebViews don't reliably suppress the synthetic `click` that
// follows a touch drag (scrolling the page, or swiping a horizontally
// scrollable table). Track touch movement ourselves so a scroll/swipe never
// triggers row navigation. Module-level state is fine: only one touch
// sequence can be in flight at a time.
const TOUCH_DRAG_THRESHOLD_PX = 10

let touchStartX = 0
let touchStartY = 0
let touchDragged = false

export function onRowTouchStart(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  touchDragged = false
}

export function onRowTouchMove(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return
  const dx = Math.abs(touch.clientX - touchStartX)
  const dy = Math.abs(touch.clientY - touchStartY)
  if (dx > TOUCH_DRAG_THRESHOLD_PX || dy > TOUCH_DRAG_THRESHOLD_PX) {
    touchDragged = true
  }
}

export function shouldIgnoreRowClick(event: Event) {
  const target = event.target
  if (target instanceof Element && target.closest(interactiveRowTargetSelector)) return true

  if (touchDragged) {
    touchDragged = false
    return true
  }

  return false
}
