import type { ReactNode } from 'react'

export function MetricGrid({
  children,
  columns = 2,
}: {
  children: ReactNode
  columns?: 2 | 3 | 4
}) {
  const columnClass =
    columns === 4
      ? 'sm:grid-cols-2 xl:grid-cols-4'
      : columns === 3
        ? 'sm:grid-cols-2 lg:grid-cols-3'
        : 'sm:grid-cols-2'

  return (
    <div
      className={`grid min-w-0 max-w-full grid-cols-1 gap-3 ${columnClass}`.trim()}
    >
      {children}
    </div>
  )
}

export function MetricTile({
  label,
  value,
  hint,
  testId,
}: {
  label: string
  value: ReactNode
  hint?: string
  testId?: string
}) {
  return (
    <div className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p
        className="mt-1 min-w-0 max-w-full text-lg font-semibold text-slate-900"
        data-testid={testId}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}
