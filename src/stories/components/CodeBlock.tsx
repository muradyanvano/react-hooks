import { useEffect, useState } from 'react'

import { CopyButton } from './CopyButton'
import { CODE_THEME, getDocsHighlighter } from './shiki'

type CodeLanguage = 'tsx' | 'bash'

export function CodeBlock({
  code,
  language = 'tsx',
  title,
}: {
  code: string
  language?: CodeLanguage
  title?: string
}) {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void getDocsHighlighter()
      .then((highlighter) =>
        highlighter.codeToHtml(code, {
          lang: language,
          theme: CODE_THEME,
        }),
      )
      .then((result) => {
        if (!cancelled) {
          setHtml(result)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHtml(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [code, language])

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          {title ?? language}
        </p>
        <CopyButton text={code} />
      </div>
      <div className="overflow-x-auto">
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
    </div>
  )
}
