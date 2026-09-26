import type { ForwardSignal } from './types'

const STATUS_TEXT: Record<ForwardSignal['status'], string> = {
  open: 'open',
  closed: 'closed',
  skipped_by_indicator: 'skipped by indicator',
  closed_skipped: 'skipped by indicator, closed',
  nosignal: 'no signal',
}

export function formatR(r: number | null | undefined, digits = 2): string {
  if (r === null || r === undefined || !Number.isFinite(r)) return '—'
  return `${r > 0 ? '+' : ''}${r.toFixed(digits)}R`
}

/** Option label for a forward-test signal in the link pickers. */
export function signalLabel(s: ForwardSignal): string {
  return `${s.sym ?? '?'} ${s.dir ?? '—'} @ ${s.sig_px ?? '—'}`
}

/** Option hint: where the rule's trade stands, plus its R_net once closed. */
export function signalHint(s: ForwardSignal): string {
  const outcome = s.r_net !== null ? ` · ${formatR(s.r_net)}` : ''
  return `${STATUS_TEXT[s.status] ?? s.status}${outcome}`
}
