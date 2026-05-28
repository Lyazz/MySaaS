const interactiveRowTargetSelector =
  'a, button, input, select, textarea, label, summary, [role="button"], [data-row-click-ignore]'

export function shouldIgnoreRowClick(event: Event) {
  const target = event.target
  return target instanceof Element && Boolean(target.closest(interactiveRowTargetSelector))
}

