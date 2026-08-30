import { useEffect, useId, useState } from 'react'

import { CopyButton } from './CopyButton'
import { ChevronIcon } from './icons'
import { CODE_THEME, getDocsHighlighter } from './shiki'

export function CodeDisclosure({
  code,
  title = 'Example code',
}: {
  code: string
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const panelId = useId()

  useEffect(() => {
    let cancelled = false

    void getDocsHighlighter()
      .then((highlighter) =>
        highlighter.codeToHtml(code, {
          lang: 'tsx',
          theme: CODE_THEME,
        }),
      )
      .then((result) => {
        if (!cancelled) {
          setHtml(result)
          setError(null)
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setHtml(null)
          setError(
            cause instanceof Error ? cause.message : 'Failed to highlight code',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [code])

  return (
    <div className="border-t border-slate-200 bg-slate-50/70">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-slate-800 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          aria-expanded={open}
          aria-controls={panelId}
          data-testid="toggle-code"
          onClick={() => {
            setOpen((value) => !value)
          }}
        >
          <ChevronIcon open={open} />
          {open ? 'Hide code' : 'Show code'}
        </button>
        {open ? <CopyButton text={code} /> : null}
      </div>

      <div
        id={panelId}
        hidden={!open}
        className="border-t border-slate-200"
        data-testid="code-panel"
      >
        {open ? (
          <div className="px-4 py-3">
            <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
              {title}
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              {html ? (
                <div
                  className="code-highlight min-w-0 text-[13px] leading-6 [&_pre]:m-0 [&_pre]:bg-transparent [&_pre]:p-4 [&_code]:font-mono"
                  data-testid="highlighted-code"
                  // Trusted static documentation snippets only.
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <pre
                  className="m-0 overflow-x-auto p-4 font-mono text-[13px] leading-6 text-slate-800"
                  data-testid="plain-code"
                >
                  <code>{code}</code>
                </pre>
              )}
            </div>
            {error ? (
              <p className="mt-2 text-xs text-rose-700" role="status">
                Syntax highlighting unavailable: {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
