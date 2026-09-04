/**
 * Storybook-only original SVG favicon data URLs.
 * Not shipped in dist. No third-party logos or branding.
 */

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const ICON_BLUE = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#2563eb"/><circle cx="16" cy="16" r="8" fill="#eff6ff"/></svg>`,
)

export const ICON_GREEN = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#059669"/><path d="M10 16h12" stroke="#ecfdf5" stroke-width="3" stroke-linecap="round"/></svg>`,
)

export const ICON_AMBER = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#d97706"/><polygon points="16,8 24,24 8,24" fill="#fffbeb"/></svg>`,
)

export const ICON_LIGHT = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#f8fafc" stroke="#cbd5e1"/><circle cx="16" cy="16" r="7" fill="#0f172a"/></svg>`,
)

export const ICON_DARK = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#0f172a"/><circle cx="16" cy="16" r="7" fill="#e2e8f0"/></svg>`,
)

export const ICON_LOADING = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#6366f1"/><circle cx="16" cy="16" r="7" fill="none" stroke="#eef2ff" stroke-width="3" stroke-dasharray="10 8"/></svg>`,
)

export const ICON_SUCCESS = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#16a34a"/><path d="M10 16l4 4 8-8" fill="none" stroke="#f0fdf4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
)

export const ICON_ERROR = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#dc2626"/><path d="M12 12l8 8M20 12l-8 8" stroke="#fef2f2" stroke-width="3" stroke-linecap="round"/></svg>`,
)

/** Deterministic badge-style favicon for documentation demos. */
export function badgeIcon(count: number): string {
  const label = count > 9 ? '9+' : String(count)
  return svgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#1d4ed8"/><circle cx="23" cy="9" r="7" fill="#ef4444"/><text x="23" y="12" text-anchor="middle" font-size="9" font-family="system-ui,sans-serif" fill="#fff">${label}</text></svg>`,
  )
}

export const SAMPLE_BASE_URL = 'https://example.com/app/'
export const SAMPLE_RELATIVE_ICON = 'assets/demo-favicon.svg'
