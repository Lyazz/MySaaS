export type ChartPoint = { x: number; y: number }

/** Cardinal-spline smoothing turned into cubic bezier segments, for less jagged line charts. */
export function buildSmoothPath(points: ChartPoint[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return d
}

/** Picks a "nice" set of ascending ticks from 0 up to a top tick that is always >= max, e.g. [0, 500, 1000, 1500, 2000]. */
export function niceTicks(max: number, count = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 1]
  const rough = max / count
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)))
  const residual = rough / magnitude
  let niceResidual = 1
  if (residual > 5) niceResidual = 10
  else if (residual > 2) niceResidual = 5
  else if (residual > 1) niceResidual = 2
  const step = niceResidual * magnitude
  // Ceil (not just loop-until-exceeds) so the top tick is guaranteed >= max — otherwise the
  // highest data point can map past the chart's edge and get clipped or spill out of the card.
  const topTick = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= topTick + step * 0.001; v += step) ticks.push(Math.round(v * 100) / 100)
  return ticks
}
