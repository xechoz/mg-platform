/** Never render more than 3 backing pixels per design unit. */
export const MAX_RENDER_SCALE = 3

/**
 * Keeps the canvas within the texture limits of low-end mobile GPUs while
 * still allowing native 4K output (3840px wide).
 */
export const MAX_CANVAS_EDGE = 4096

export interface RenderMetrics {
  readonly designWidth: number
  readonly designHeight: number
  readonly cssWidth: number
  readonly cssHeight: number
  readonly canvasWidth: number
  readonly canvasHeight: number
  /** Backing pixels per design unit. */
  readonly scaleX: number
  readonly scaleY: number
  /** Text glyphs are rasterized at least at the sharper axis. */
  readonly textResolution: number
  /** Changes whenever any metric changes, so scenes can refresh cached work. */
  readonly version: number
}

export type RenderMetricsInput = Omit<RenderMetrics, 'version'>

const DEFAULT_METRICS: RenderMetrics = {
  designWidth: 1280,
  designHeight: 720,
  cssWidth: 1280,
  cssHeight: 720,
  canvasWidth: 1280,
  canvasHeight: 720,
  scaleX: 1,
  scaleY: 1,
  textResolution: 1,
  version: 0,
}

let current = DEFAULT_METRICS

/**
 * The canvas backing store is sized in physical device pixels, so a design unit
 * maps to more than one pixel on phones, Retina desktops and 4K monitors.
 * Clamping to at least 1 keeps very low density screens cheap; clamping to 3
 * avoids a 5K/8K canvas on huge displays.
 */
export function computeRenderScale(
  cssWidth: number,
  cssHeight: number,
  designWidth: number,
  designHeight: number,
  dpr: number,
  maxScale = MAX_RENDER_SCALE,
  maxEdge = MAX_CANVAS_EDGE,
): number {
  if (
    !Number.isFinite(cssWidth) ||
    !Number.isFinite(cssHeight) ||
    cssWidth <= 0 ||
    cssHeight <= 0 ||
    designWidth <= 0 ||
    designHeight <= 0
  ) {
    return 1
  }

  const density = Number.isFinite(dpr) && dpr > 0 ? dpr : 1
  const physical = Math.min(
    (cssWidth * density) / designWidth,
    (cssHeight * density) / designHeight,
    maxEdge / designWidth,
    maxEdge / designHeight,
  )

  return Math.max(1, Math.min(maxScale, physical))
}

export function computeCanvasSize(
  designWidth: number,
  designHeight: number,
  scale: number,
): { width: number; height: number } {
  return {
    width: Math.max(1, Math.round(designWidth * scale)),
    height: Math.max(1, Math.round(designHeight * scale)),
  }
}

/** Pure part of the metrics calculation, kept testable without a browser. */
export function computeRenderMetrics(
  cssWidth: number,
  cssHeight: number,
  designWidth: number,
  designHeight: number,
  dpr: number,
): RenderMetricsInput {
  const scale = computeRenderScale(cssWidth, cssHeight, designWidth, designHeight, dpr)
  const canvas = computeCanvasSize(designWidth, designHeight, scale)

  return {
    designWidth,
    designHeight,
    cssWidth,
    cssHeight,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    scaleX: canvas.width / designWidth,
    scaleY: canvas.height / designHeight,
    textResolution: Math.max(canvas.width / designWidth, canvas.height / designHeight),
  }
}

export function getRenderMetrics(): RenderMetrics {
  return current
}

export function getTextResolution(): number {
  return current.textResolution
}

export function setRenderMetrics(next: RenderMetricsInput): RenderMetrics {
  if (
    next.designWidth === current.designWidth &&
    next.designHeight === current.designHeight &&
    next.cssWidth === current.cssWidth &&
    next.cssHeight === current.cssHeight &&
    next.canvasWidth === current.canvasWidth &&
    next.canvasHeight === current.canvasHeight &&
    next.scaleX === current.scaleX &&
    next.scaleY === current.scaleY &&
    next.textResolution === current.textResolution
  ) {
    return current
  }

  current = { ...next, version: current.version + 1 }
  return current
}
