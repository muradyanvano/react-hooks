type SupportState = 'supported' | 'unsupported' | 'partial' | 'unknown'

const stateLabels: Record<SupportState, string> = {
  supported: 'Supported',
  unsupported: 'Not supported',
  partial: 'Partial support',
  unknown: 'Support unknown',
}

const stateClasses: Record<SupportState, string> = {
  supported: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  unsupported: 'border-rose-200 bg-rose-50 text-rose-800',
  partial: 'border-amber-200 bg-amber-50 text-amber-900',
  unknown: 'border-slate-200 bg-slate-50 text-slate-700',
}

export function SupportBadge({
  state,
  label,
  testId,
}: {
  state: SupportState
  label?: string
  testId?: string
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${stateClasses[state]}`}
      data-testid={testId}
    >
      {label ?? stateLabels[state]}
    </span>
  )
}
