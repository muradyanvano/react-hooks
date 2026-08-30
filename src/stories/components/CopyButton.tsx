import { useEffect, useId, useRef, useState } from 'react'

import { CheckIcon, CopyIcon } from './icons'

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to legacy path.
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const succeeded = document.execCommand('copy')
    document.body.removeChild(textarea)
    return succeeded
  } catch {
    return false
  }
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const liveId = useId()

  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        data-testid="copy-code"
        onClick={() => {
          void (async () => {
            const ok = await writeClipboard(text)
            if (timeoutRef.current != null) {
              window.clearTimeout(timeoutRef.current)
            }
            if (!ok) {
              setCopied(false)
              setFailed(true)
              timeoutRef.current = window.setTimeout(() => {
                setFailed(false)
              }, 1800)
              return
            }
            setFailed(false)
            setCopied(true)
            timeoutRef.current = window.setTimeout(() => {
              setCopied(false)
            }, 1800)
          })()
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? 'Copied' : failed ? 'Copy failed' : 'Copy code'}
      </button>
      <span id={liveId} className="sr-only" aria-live="polite">
        {copied
          ? 'Code copied to clipboard'
          : failed
            ? 'Unable to copy code'
            : ''}
      </span>
    </div>
  )
}
