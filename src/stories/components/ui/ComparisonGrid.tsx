import type { ReactNode } from 'react'

export function ComparisonGrid({
  left,
  right,
  leftLabel = 'Before',
  rightLabel = 'After',
}: {
  left: ReactNode
  right: ReactNode
  leftLabel?: string
  rightLabel?: string
}) {
  return (
    <div className="grid min-w-0 max-w-full grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="min-w-0 max-w-full space-y-2">
        <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {leftLabel}
        </h3>
        <div className="min-w-0 max-w-full">{left}</div>
      </section>
      <section className="min-w-0 max-w-full space-y-2">
        <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {rightLabel}
        </h3>
        <div className="min-w-0 max-w-full">{right}</div>
      </section>
    </div>
  )
}
