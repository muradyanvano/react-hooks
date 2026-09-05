const CARD_SHOWCASE_CLASS_RE = /\bcards\b|\bshowcase\b|\bcard\b/i

function isInsideAllowedHorizontalScroll(element: Element): boolean {
  return element.closest('[data-allow-h-scroll]') != null
}

function isShowcaseSurface(element: Element): boolean {
  if (element.hasAttribute('data-showcase')) {
    return true
  }
  const className = element.className
  if (typeof className !== 'string' || className.length === 0) {
    return false
  }
  return CARD_SHOWCASE_CLASS_RE.test(className)
}

function collectCardShowcaseElements(root: ParentNode): Element[] {
  const elements: Element[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)

  let node: Node | null =
    root instanceof Element ? walker.currentNode : walker.nextNode()
  while (node != null) {
    if (node instanceof Element) {
      if (isShowcaseSurface(node) && !isInsideAllowedHorizontalScroll(node)) {
        elements.push(node)
      }
    }
    node = walker.nextNode()
  }

  return elements
}

/**
 * Assert the Storybook canvas does not introduce horizontal page overflow.
 * Card/showcase regions may scroll internally when marked `data-allow-h-scroll`.
 */
export function assertNoPageOverflow(root: ParentNode = document): void {
  const docEl = document.documentElement
  const viewportWidth = docEl.clientWidth

  if (docEl.scrollWidth > viewportWidth) {
    throw new Error(
      `Page horizontal overflow: scrollWidth ${docEl.scrollWidth} > clientWidth ${viewportWidth}`,
    )
  }

  const offenders = collectCardShowcaseElements(root).filter((element) => {
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.right > viewportWidth + 1
  })

  if (offenders.length > 0) {
    const summary = offenders
      .slice(0, 5)
      .map((element) => {
        const rect = element.getBoundingClientRect()
        const tag = element.tagName.toLowerCase()
        const testId = element.getAttribute('data-testid')
        const suffix = testId ? `[data-testid="${testId}"]` : ''
        return `<${tag}${suffix}> right=${Math.round(rect.right)}px`
      })
      .join('; ')

    throw new Error(
      `Card/showcase content escaped viewport (${offenders.length}): ${summary}`,
    )
  }
}

/**
 * Assert a StatusPanel (or other stress fixture panel) stays within the canvas.
 */
export function assertPanelContained(
  canvasElement: HTMLElement,
  panelTestId = 'stress-status-panel',
): void {
  const panel = canvasElement.querySelector<HTMLElement>(
    `[data-testid="${panelTestId}"]`,
  )
  if (panel == null) {
    throw new Error(`Missing panel [data-testid="${panelTestId}"]`)
  }

  const panelRect = panel.getBoundingClientRect()
  const canvasRect = canvasElement.getBoundingClientRect()

  if (panelRect.right > canvasRect.right + 1) {
    throw new Error(
      `Panel escaped canvas: panel.right ${Math.round(panelRect.right)} > canvas.right ${Math.round(canvasRect.right)}`,
    )
  }
}
