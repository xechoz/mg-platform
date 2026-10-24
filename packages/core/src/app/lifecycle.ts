export function onAppHidden(callback: () => void): () => void {
  const onVisibility = (): void => {
    if (document.hidden) callback()
  }
  const onBlur = (): void => callback()

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('blur', onBlur)
  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('blur', onBlur)
  }
}
