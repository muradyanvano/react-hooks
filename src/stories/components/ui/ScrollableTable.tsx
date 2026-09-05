import type { ReactNode } from 'react'

export function ScrollableTable({
  children,
  caption,
  className = '',
}: {
  children: ReactNode
  caption?: string
  className?: string
}) {
  return (
    <div
      className={`min-w-0 max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white ${className}`.trim()}
      data-allow-h-scroll
    >
      <table className="min-w-full border-collapse text-left text-sm">
        {caption ? (
          <caption className="px-3 py-2 text-left text-xs font-medium text-slate-500">
            {caption}
          </caption>
        ) : null}
        {children}
      </table>
    </div>
  )
}
