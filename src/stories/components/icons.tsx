export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path
        d="M4 6.5 8 10.5 12 6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="10" cy="7" r="3" />
      <path
        d="M4.5 16.5c1.4-2.4 3.3-3.5 5.5-3.5s4.1 1.1 5.5 3.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M10 3.5a4 4 0 0 1 4 4v2.2c0 .5.2 1 .5 1.4l.8 1.1H4.7l.8-1.1c.3-.4.5-.9.5-1.4V7.5a4 4 0 0 1 4-4Z" />
      <path d="M8.5 16.5a1.5 1.5 0 0 0 3 0" strokeLinecap="round" />
    </svg>
  )
}

export function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="10" cy="10" r="2.25" />
      <path
        d="M10 3.5v1.2M10 15.3v1.2M3.5 10h1.2M15.3 10h1.2M5.4 5.4l.85.85M13.75 13.75l.85.85M5.4 14.6l.85-.85M13.75 6.25l.85-.85"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function FilterIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path
        d="M4 5.5h12l-4.2 5v4.5L8.2 13.5v-3L4 5.5Z"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path
        d="M4 6.5 8 10.5 12 6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
