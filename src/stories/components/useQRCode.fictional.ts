/**
 * Storybook-only fictional QR payload strings.
 * Not shipped in dist. Never use real credentials, PII, or payment data.
 */

/** Fictional WPA network — demo values only. */
export const FICTIONAL_WIFI_PAYLOAD =
  'WIFI:T:WPA;S:DemoGuestNetwork;P:FictionalPass-2026;H:false;;'

/** Fictional vCard contact — demo values only. */
export const FICTIONAL_VCARD_PAYLOAD = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  'FN:Demo Person',
  'ORG:Example Labs (Fictional)',
  'TEL;TYPE=CELL:+15555550100',
  'EMAIL:demo.contact@example.invalid',
  'URL:https://example.invalid/demo',
  'END:VCARD',
].join('\n')

/** Fictional mailto composition — demo values only. */
export const FICTIONAL_MAILTO_PAYLOAD =
  'mailto:demo@example.invalid?subject=Demo%20inquiry&body=Hello%20from%20Storybook%20demo.'

/** Fictional SMS payload — demo values only. */
export const FICTIONAL_SMS_PAYLOAD =
  'smsto:+15555550123:Demo message from Storybook.'

/** Fictional calendar event (iCalendar) — demo values only. */
export const FICTIONAL_VEVENT_PAYLOAD = [
  'BEGIN:VEVENT',
  'UID:demo-event-001@example.invalid',
  'DTSTAMP:20260115T120000Z',
  'DTSTART:20260201T140000Z',
  'DTEND:20260201T150000Z',
  'SUMMARY:Fictional Team Demo',
  'LOCATION:Example Conference Room (Virtual)',
  'DESCRIPTION:Storybook-only calendar payload. Not a real invitation.',
  'END:VEVENT',
].join('\n')

export const SAMPLE_GENERATOR_TEXT = 'Hello from @muradyanvano/react-hooks'

export const SAMPLE_WEBSITE_URL = 'https://example.com/docs/react-hooks'

export const SAMPLE_PLAIN_TEXT = 'Plain text QR payload for documentation.'

export const SAMPLE_UNICODE_TEXT = 'Unicode demo: café, 日本語, 🙂'
