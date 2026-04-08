const FALLBACK_INSTALLED_ATTR = 'data-img-fallback-installed'

export type InstallImageFallbackOptions = {
  root: ParentNode
  fallbackSrc: string
  fallbackClass?: string
  treatSrcAsUnavailable?: (src: string) => boolean
}

const isElement = (value: unknown): value is Element =>
  typeof value === 'object' && value != null && value instanceof Element

const isImage = (value: unknown): value is HTMLImageElement =>
  typeof value === 'object' && value != null && value instanceof HTMLImageElement

const installForImage = (img: HTMLImageElement, options: InstallImageFallbackOptions) => {
  if (img.hasAttribute(FALLBACK_INSTALLED_ATTR)) return
  img.setAttribute(FALLBACK_INSTALLED_ATTR, 'true')

  const applyFallback = () => {
    const current = img.getAttribute('src') || ''
    if (current === options.fallbackSrc) return
    img.setAttribute('src', options.fallbackSrc)
    if (options.fallbackClass) img.classList.add(options.fallbackClass)
  }

  img.addEventListener('error', applyFallback)

  // Handle <img> without src (can display broken-icon in some browsers)
  const initialSrc = img.getAttribute('src')
  if (!initialSrc) {
    applyFallback()
  } else if (options.treatSrcAsUnavailable?.(initialSrc)) {
    applyFallback()
  }
}

const installForNode = (node: Node, options: InstallImageFallbackOptions) => {
  if (isImage(node)) {
    installForImage(node, options)
    return
  }
  if (!isElement(node)) return
  node.querySelectorAll('img').forEach((img) => installForImage(img, options))
}

export const installImageErrorFallback = (options: InstallImageFallbackOptions) => {
  // Initial scan
  options.root.querySelectorAll?.('img')?.forEach((img) => installForImage(img as HTMLImageElement, options))

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'src' && isImage(mutation.target)) {
        const img = mutation.target
        const src = img.getAttribute('src') || ''
        if (!src || options.treatSrcAsUnavailable?.(src)) {
          installForImage(img, options)
          img.setAttribute('src', options.fallbackSrc)
          if (options.fallbackClass) img.classList.add(options.fallbackClass)
        } else {
          installForImage(img, options)
        }
        continue
      }
      mutation.addedNodes.forEach((node) => installForNode(node, options))
    }
  })

  observer.observe(options.root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src']
  })

  return () => observer.disconnect()
}
