import type { ReactNode } from 'react'

import { CodeDisclosure } from './CodeDisclosure'

export function ExampleShowcase({
  title,
  description,
  instruction,
  badge,
  code,
  children,
  aside,
}: {
  title: string
  description: string
  instruction: string
  badge?: string | undefined
  code: string
  children: ReactNode
  aside?: ReactNode | undefined
}) {
  return (
    <section className="mx-auto w-full max-w-5xl p-3 sm:p-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="space-y-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-indigo-600 uppercase">
                useOnClickOutside
              </p>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {title}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {description}
              </p>
            </div>
            {badge ? (
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Try it: </span>
            {instruction}
          </p>
        </header>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="min-w-0 space-y-4">{children}</div>
          {aside ? <aside className="min-w-0">{aside}</aside> : null}
        </div>

        <CodeDisclosure code={code} title="Consumer TypeScript example" />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Example styling uses Tailwind CSS for documentation only. The hooks
        package does not require Tailwind.
      </p>
    </section>
  )
}

export function StatusPanel({
  items,
}: {
  items: Array<{ label: string; value: string; testId?: string | undefined }>
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Live status
      </h3>
      <dl className="mt-3 space-y-2.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start justify-between gap-3 text-sm"
          >
            <dt className="text-slate-500">{item.label}</dt>
            <dd
              className="text-right font-semibold text-slate-900"
              data-testid={item.testId}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function OutsideTarget({
  label = 'Outside interaction',
  testId = 'outside-button',
}: {
  label?: string
  testId?: string
}) {
  return (
    <div
      className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3"
      data-testid="outside-region"
    >
      <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Outside area
      </p>
      <button
        type="button"
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        data-testid={testId}
      >
        {label}
      </button>
    </div>
  )
}
