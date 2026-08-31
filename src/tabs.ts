export const TABS = [
  { key: 'home', label: 'Home' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'playbooks', label: 'Playbooks' },
  { key: 'review', label: 'Review' },
  { key: 'trades', label: 'Trades' },
  { key: 'missed', label: 'Missed' },
  { key: 'whatsnew', label: "What's New" },
] as const

export type TabKey = (typeof TABS)[number]['key']
