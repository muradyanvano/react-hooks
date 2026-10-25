/**
 * Storybook-only clipboard write that never rejects. The async Clipboard API
 * throws when the document is unfocused, permission is denied, or the context
 * is insecure; examples must show failure instead of an unhandled rejection.
 */
export async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to legacy path.
  }

  const previousFocus = document.activeElement
  const textarea = document.createElement('textarea')
  try {
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
    if (previousFocus instanceof HTMLElement) {
      previousFocus.focus({ preventScroll: true })
    }
  }
}
