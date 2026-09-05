import type { ReactNode } from 'react'

export function BrowserFrame({
  url = 'https://example.local',
  children,
  className = '',
}: {
  url?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm ${className}`.trim()}
    >
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <span className="inline-flex gap-1" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-rose-300" />
          <span className="size-2.5 rounded-full bg-amber-300" />
          <span className="size-2.5 rounded-full bg-emerald-300" />
        </span>
        <p className="min-w-0 flex-1 truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
          {url}
        </p>
      </div>
      <div className="min-w-0 max-w-full bg-white p-3 sm:p-4">{children}</div>
    </div>
  )
}

export function DeviceFrame({
  label = 'Device preview',
  children,
  className = '',
}: {
  label?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`mx-auto min-w-0 max-w-sm rounded-[1.75rem] border-[10px] border-slate-800 bg-slate-800 shadow-lg ${className}`.trim()}
      aria-label={label}
    >
      <div className="overflow-hidden rounded-[1.1rem] bg-white">
        <div className="min-w-0 max-w-full p-3 sm:p-4">{children}</div>
      </div>
    </div>
  )
}
