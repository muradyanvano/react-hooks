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
  const [result, setResult] = useState<{
    code: string
    html: string | null
    error: string | null
  }>({ code: '', html: null, error: null })
  const panelId = useId()
  const loading =
    result.code !== code ||
    (result.code === code && result.html === null && result.error === null)

  useEffect(() => {
    let cancelled = false

    void getDocsHighlighter()
      .then((highlighter) =>
        highlighter.codeToHtml(code, {
          lang: 'tsx',
          theme: CODE_THEME,
        }),
      )
      .then((highlighted) => {
        if (!cancelled) {
          setResult({ code, html: highlighted, error: null })
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setResult({
            code,
            html: null,
            error:
              cause instanceof Error
                ? cause.message
                : 'Failed to highlight code',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [code])

  return (
    <div className="border-t border-slate-200 bg-slate-50/70">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
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
          <div className="px-3 py-3 sm:px-4 sm:py-4">
            <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
              {title}
            </p>
            <div
              className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"
              data-allow-h-scroll
            >
              {result.html && result.code === code ? (
                <div
                  className="code-highlight min-w-0 max-w-full text-[13px] leading-6 [&_pre]:m-0 [&_pre]:min-w-0 [&_pre]:max-w-full [&_pre]:bg-transparent [&_pre]:p-3 [&_pre]:sm:p-4 [&_code]:font-mono"
                  data-testid="highlighted-code"
                  // Trusted static documentation snippets only.
                  dangerouslySetInnerHTML={{ __html: result.html }}
                />
              ) : (
                <div className="min-w-0 max-w-full">
                  {loading ? (
                    <p
                      className="border-b border-slate-100 px-3 py-2 text-xs text-slate-500 sm:px-4"
                      data-testid="code-loading"
                      role="status"
                    >
                      Preparing syntax highlight…
                    </p>
                  ) : null}
                  <pre
                    className="m-0 min-w-0 max-w-full overflow-x-auto p-3 font-mono text-[13px] leading-6 text-slate-800 sm:p-4"
                    data-testid="plain-code"
                  >
                    <code>{code}</code>
                  </pre>
                </div>
              )}
            </div>
            {result.error && result.code === code ? (
              <p className="mt-2 text-xs text-rose-700" role="status">
                Syntax highlighting unavailable: {result.error}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
