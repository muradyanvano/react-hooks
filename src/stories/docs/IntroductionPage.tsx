import { useMemo, useState } from 'react'

import {
  HOOK_CATALOG_LIST,
  HOOK_COUNT,
  HOOK_CATEGORIES,
  hookDocsPath,
  hooksByCategory,
} from './catalog'
import { PACKAGE_NAME, PACKAGE_STATUS_LABEL } from './packageMetadata'
import type { HookCategory, HookDocumentation } from './types'

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase()
}

export function IntroductionPage() {
  const [query, setQuery] = useState('')

  const filteredCategories = useMemo((): Array<{
    category: HookCategory
    hooks: HookDocumentation[]
  }> => {
    const normalized = normalizeQuery(query)

    return HOOK_CATEGORIES.map((category: HookCategory) => {
      const hooks = hooksByCategory(category).filter((hook) => {
        if (!normalized) return true
        return (
          hook.name.toLowerCase().includes(normalized) ||
          hook.purpose.toLowerCase().includes(normalized)
        )
      })

      return { category, hooks }
    }).filter((entry) => entry.hooks.length > 0)
  }, [query])

  const visibleCount = filteredCategories.reduce(
    (total: number, entry) => total + entry.hooks.length,
    0,
  )

  return (
    <div className="sb-unstyled mx-auto max-w-5xl space-y-8 px-2 py-6 font-sans text-slate-900">
      <header className="space-y-4 border-b border-slate-200 pb-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-indigo-600 uppercase">
          React hooks library
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          {PACKAGE_NAME}
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-600">
          Production-oriented React hooks for React 18 and 19. This Storybook
          documents public package behavior with interactive examples.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            {PACKAGE_STATUS_LABEL}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {PACKAGE_NAME}
          </span>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {HOOK_COUNT} public hooks
          </span>
          <a
            className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-800 underline-offset-2 hover:underline"
            href="https://muradyanvano1995.github.io/react-hooks/"
            rel="noreferrer"
            target="_blank"
          >
            GitHub Pages docs
          </a>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Principles</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            'Strongly typed TypeScript APIs',
            'SSR-safe module imports',
            'StrictMode-safe effect cleanup',
            'Tree-shakable ESM-only builds',
            'Minimal runtime dependencies (`qrcode` for useQRCode)',
            'React 18 and 19 peer support',
          ].map((item) => (
            <li
              key={item}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Hook catalog</h2>
            <p className="text-sm text-slate-600">
              Showing {visibleCount} of {HOOK_COUNT} hooks across{' '}
              {HOOK_CATEGORIES.length} categories.
            </p>
          </div>
          <label className="block w-full sm:max-w-xs">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              Search hooks
            </span>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or purpose…"
              type="search"
              value={query}
            />
          </label>
        </div>

        <div className="space-y-8">
          {filteredCategories.map(({ category, hooks }) => (
            <CategorySection category={category} hooks={hooks} key={category} />
          ))}
        </div>

        {visibleCount === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600">
            No hooks match “{query}”.
          </p>
        ) : null}
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-6">
        <h2 className="text-xl font-semibold">Next steps</h2>
        <div className="flex flex-wrap gap-3">
          <a
            className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white no-underline"
            href="?path=/docs/getting-started--documentation"
            target="_top"
          >
            Getting started
          </a>
          <a
            className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 no-underline"
            href={hookDocsPath(HOOK_CATALOG_LIST[0]!.name)}
            target="_top"
          >
            Open {HOOK_CATALOG_LIST[0]!.name} docs
          </a>
        </div>
      </section>
    </div>
  )
}

function CategorySection({
  category,
  hooks,
}: {
  category: HookCategory
  hooks: HookDocumentation[]
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">{category}</h3>
        <span className="text-xs font-medium text-slate-500">
          {hooks.length} hook{hooks.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {hooks.map((hook) => (
          <li key={hook.name}>
            <a
              className="flex h-full flex-col rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 no-underline transition hover:border-indigo-200"
              href={hookDocsPath(hook.name)}
              target="_top"
            >
              <p className="break-words text-sm font-semibold text-indigo-900">
                {hook.name}
              </p>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-indigo-900/80">
                {hook.purpose}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
