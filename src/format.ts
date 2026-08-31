export function formatRatio(n: number): string {
  return n >= 999 ? '∞' : n.toFixed(2)
}

/** Time-of-day greeting — shared by App / HeroHeader / UtilityPanel. */
export function greeting(d: Date = new Date()): string {
  const h = d.getHours()
  if (h < 5) return 'Late session'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
