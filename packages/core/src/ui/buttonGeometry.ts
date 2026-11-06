/**
 * Gloss bar metrics for a button of the given face size. The corner radius is
 * clamped to half the gloss height: a rounded rect whose radius overshoots its
 * height renders pinched fishtail ends, which showed as dents at both ends of
 * the highlight on primary buttons.
 */
export function glossMetrics(
  height: number,
  radius: number,
): { readonly h: number; readonly r: number } {
  const h = Math.max(6, height * 0.14)
  return { h, r: Math.min(h / 2, Math.max(4, radius * 0.45)) }
}

/**
 * Horizontal inset for the lip layer so its side arcs stay hidden under the
 * face. The lip is the same stadium shifted down, so without an inset its
 * arcs cross the face arcs and a dark wedge peeks out at the middle of both
 * ends. 2 covers the worst case (compact buttons); the 6-unit bottom
 * thickness that reads as 3D is untouched.
 */
export const LIP_SIDE_INSET = 2
