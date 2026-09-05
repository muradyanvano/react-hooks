import type { ReactNode } from 'react'

export function DemoSurface({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`min-w-0 max-w-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 ${className}`.trim()}
    >
      {children}
    </div>
  )
}
