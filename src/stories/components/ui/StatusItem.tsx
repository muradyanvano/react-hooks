export type StatusValueMode = 'inline' | 'block' | 'code' | 'truncate'

const LONG_VALUE_THRESHOLD = 48

function looksLikeToken(value: string): boolean {
  if (/^https?:\/\//i.test(value)) {
    return true
  }
  if (/^data:[^;]+;base64,/i.test(value)) {
    return true
  }
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
    return true
  }
  if (/^[A-Za-z0-9+/=]{64,}$/.test(value)) {
    return true
  }
  return false
}

export function resolveStatusValueMode(
  value: string,
  mode?: StatusValueMode,
): StatusValueMode {
  if (mode != null) {
    return mode
  }
  if (value.length > LONG_VALUE_THRESHOLD) {
    return looksLikeToken(value) ? 'code' : 'block'
  }
  if (looksLikeToken(value)) {
    return 'code'
  }
  return 'inline'
}

export function StatusItem({
  label,
  value,
  testId,
  mode,
}: {
  label: string
  value: string
  testId?: string
  mode?: StatusValueMode
}) {
  const resolvedMode = resolveStatusValueMode(value, mode)

  if (resolvedMode === 'block' || resolvedMode === 'code') {
    return (
      <div className="space-y-1">
        <dt className="text-xs font-medium text-slate-500">{label}</dt>
        <dd
          className={
            resolvedMode === 'code'
              ? 'min-w-0 max-w-full overflow-x-auto rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs leading-5 break-all text-slate-900'
              : 'min-w-0 max-w-full text-sm leading-6 font-semibold whitespace-pre-wrap [overflow-wrap:anywhere] text-slate-900'
          }
          data-allow-h-scroll={resolvedMode === 'code' ? true : undefined}
          data-testid={testId}
        >
          {value}
        </dd>
      </div>
    )
  }

  if (resolvedMode === 'truncate') {
    return (
      <div className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1">
        <dt className="text-xs font-medium text-slate-500">{label}</dt>
        <dd
          className="min-w-0 max-w-full truncate text-right text-sm font-semibold text-slate-900"
          title={value}
          data-testid={testId}
        >
          {value}
        </dd>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-start gap-x-3 gap-y-1">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd
        className="min-w-0 max-w-full text-right text-sm font-semibold whitespace-pre-wrap [overflow-wrap:anywhere] text-slate-900"
        data-testid={testId}
      >
        {value}
      </dd>
    </div>
  )
}
