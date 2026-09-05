import type { ReactNode } from 'react'

export function ControlBar({
  children,
  label = 'Controls',
}: {
  children: ReactNode
  label?: string
}) {
  return (
    <div
      className="flex min-w-0 max-w-full flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
      role="toolbar"
      aria-label={label}
    >
      {children}
    </div>
  )
}
