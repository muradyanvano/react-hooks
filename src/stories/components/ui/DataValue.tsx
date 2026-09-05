export function DataValue({
  value,
  testId,
  className = '',
}: {
  value: string
  testId?: string
  className?: string
}) {
  return (
    <span
      className={`min-w-0 max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] ${className}`.trim()}
      data-testid={testId}
    >
      {value}
    </span>
  )
}

export function CodeValue({
  value,
  testId,
  className = '',
}: {
  value: string
  testId?: string
  className?: string
}) {
  return (
    <code
      className={`block min-w-0 max-w-full overflow-x-auto rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs leading-5 break-all text-slate-900 ${className}`.trim()}
      data-allow-h-scroll
      data-testid={testId}
    >
      {value}
    </code>
  )
}
