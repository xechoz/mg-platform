/**
 * Matches the CSS portrait blocker. Games use the same query to auto-pause
 * instead of letting the snake keep moving behind the rotate hint.
 */
export const PORTRAIT_BLOCK_QUERY = '(orientation: portrait) and (pointer: coarse)'
