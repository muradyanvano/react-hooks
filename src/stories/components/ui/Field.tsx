import type { ReactNode } from 'react'

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0 max-w-full space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <div className="min-w-0 max-w-full">{children}</div>
      {hint ? (
        <p
          className="text-xs leading-5 text-slate-500"
          id={htmlFor ? `${htmlFor}-hint` : undefined}
        >
          {hint}
        </p>
      ) : null}
    </div>
  )
}
