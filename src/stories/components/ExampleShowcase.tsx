import type { ReactNode } from 'react'

import { CodeDisclosure } from './CodeDisclosure'
import { Callout } from './ui/Callout'
import { DemoSurface } from './ui/DemoSurface'
import { PreviewCard } from './ui/PreviewCard'
import { StatusItem, type StatusValueMode } from './ui/StatusItem'

export type ExampleShowcaseLayout =
  | 'split'
  | 'single'
  | 'dashboard'
  | 'inspector'
  | 'comparison'
  | 'framed'
  | 'table'
  | 'form'
  | 'visualization'

const layoutBodyClasses: Record<ExampleShowcaseLayout, string> = {
  split: 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)]',
  single: 'grid gap-4',
  dashboard:
    'grid min-w-0 max-w-full gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)]',
  inspector:
    'grid min-w-0 max-w-full gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(14rem,20rem)]',
  comparison: 'grid min-w-0 max-w-full gap-4',
  framed: 'grid min-w-0 max-w-full gap-4',
  table: 'grid min-w-0 max-w-full gap-4',
  form: 'grid min-w-0 max-w-full gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)]',
  visualization: 'grid min-w-0 max-w-full gap-4',
}

export function ExampleShowcase({
  title,
  description,
  instruction,
  badge,
  code,
  children,
  aside,
  notes,
  hookName = 'useOnClickOutside',
  layout = 'split',
}: {
  title: string
  description: string
  instruction: string
  badge?: string | undefined
  code: string
  children: ReactNode
  aside?: ReactNode | undefined
  notes?: string | undefined
  hookName?: string | undefined
  layout?: ExampleShowcaseLayout
}) {
  const showAsideColumn =
    aside != null &&
    (layout === 'split' ||
      layout === 'dashboard' ||
      layout === 'inspector' ||
      layout === 'form')

  const body = (
    <div className={`min-w-0 max-w-full ${layoutBodyClasses[layout]}`}>
      <div className="min-w-0 max-w-full space-y-4">
        {layout === 'framed' ? (
          <PreviewCard>
            <div className="min-w-0 max-w-full">{children}</div>
          </PreviewCard>
        ) : layout === 'visualization' ? (
          <DemoSurface className="min-h-[12rem]">{children}</DemoSurface>
        ) : (
          children
        )}
        {notes ? (
          <Callout tone="neutral" title="Note">
            {notes}
          </Callout>
        ) : null}
      </div>
      {showAsideColumn ? (
        <aside className="min-w-0 max-w-full xl:min-w-[12rem]">{aside}</aside>
      ) : null}
    </div>
  )

  return (
    <section
      className="mx-auto w-full max-w-5xl p-3 sm:p-5"
      data-showcase="example"
    >
      <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="space-y-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 max-w-full flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 max-w-full space-y-1.5">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-indigo-600 uppercase">
                {hookName}
              </p>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {title}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {description}
              </p>
            </div>
            {badge ? (
              <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Try it: </span>
            {instruction}
          </p>
        </header>

        <div className="min-w-0 max-w-full p-4 sm:p-5">{body}</div>

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
  items: Array<{
    label: string
    value: string
    testId?: string | undefined
    mode?: StatusValueMode
  }>
}) {
  return (
    <div
      className="min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 p-3"
      data-showcase="status-panel"
    >
      <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Live status
      </h3>
      <dl className="mt-3 space-y-3">
        {items.map((item) => (
          <StatusItem
            key={item.label}
            label={item.label}
            value={item.value}
            {...(item.testId !== undefined ? { testId: item.testId } : {})}
            {...(item.mode !== undefined ? { mode: item.mode } : {})}
          />
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
      className="min-w-0 max-w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3"
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

export type { StatusValueMode } from './ui/StatusItem'
