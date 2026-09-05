import type { ReactNode } from 'react'

type CalloutTone = 'info' | 'success' | 'warning' | 'neutral'

const toneClasses: Record<CalloutTone, string> = {
  info: 'border-indigo-200 bg-indigo-50 text-indigo-950',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  neutral: 'border-slate-200 bg-slate-50 text-slate-800',
}

export function Callout({
  title,
  children,
  tone = 'info',
}: {
  title?: string
  children: ReactNode
  tone?: CalloutTone
}) {
  return (
    <aside
      className={`min-w-0 max-w-full rounded-lg border px-3 py-2.5 text-sm leading-6 ${toneClasses[tone]}`}
      role="note"
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div className="min-w-0 max-w-full [overflow-wrap:anywhere]">
        {children}
      </div>
    </aside>
  )
}
