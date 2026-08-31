import { useCountUp } from './useCountUp'

const NUM_RE = /^(.*?)(-?)\s*(\$?)\s*(\d[\d,]*(?:\.(\d+))?)(.*)$/s

/**
 * Drop-in replacement for a pre-formatted numeric string (e.g. "$1,234",
 * "-$1,050", "58.3%", "1.80"). Tweens the number on first mount, preserving the
 * sign, currency symbol, thousands grouping, decimal places, prefix and suffix.
 * Renders the string verbatim if it contains no number.
 */
export function CountUpValue({ value, enabled = true }: { value: string; enabled?: boolean }) {
  const m = NUM_RE.exec(value)
  const target = m ? Number((m[2] + m[4].replace(/,/g, '')).replace(/^-$/, '0')) : NaN
  const animated = useCountUp(Number.isFinite(target) ? target : 0, {
    enabled: enabled && Number.isFinite(target),
  })

  if (!m || !Number.isFinite(target)) return <>{value}</>

  const [, prefix, , currency, digits, fraction, suffix] = m
  const decimals = fraction ? fraction.length : 0
  const grouped = digits.includes(',')
  const abs = Math.abs(animated)
  const body = abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouped,
  })
  const sign = animated < 0 ? '-' : ''

  return (
    <>
      {prefix}
      {sign}
      {currency}
      {body}
      {suffix}
    </>
  )
}
