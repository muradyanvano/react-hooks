import type { ReactNode } from 'react'

export function PreviewCard({
  title,
  description,
  children,
  className = '',
  footer,
}: {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  footer?: ReactNode
}) {
  return (
    <article
      className={`min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`.trim()}
    >
      {title || description ? (
        <header className="space-y-1 border-b border-slate-200 px-3 py-3 sm:px-4">
          {title ? (
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          ) : null}
          {description ? (
            <p className="text-sm leading-6 text-slate-600">{description}</p>
          ) : null}
        </header>
      ) : null}
      <div className="min-w-0 max-w-full p-3 sm:p-4">{children}</div>
      {footer ? (
        <footer className="border-t border-slate-200 px-3 py-2.5 sm:px-4">
          {footer}
        </footer>
      ) : null}
    </article>
  )
}
