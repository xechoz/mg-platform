/**
 * Key codes whose browser default must be suppressed (page scroll inside the
 * host iframe). Phaser handles the event first and then calls `preventDefault`,
 * so game bindings keep working; doing this from our own capture-phase listener
 * would set `defaultPrevented` before Phaser sees the event and kill input.
 *
 * 32 = Space, 37 = ArrowLeft, 38 = ArrowUp, 39 = ArrowRight, 40 = ArrowDown
 */
export const KEYBOARD_CAPTURE: readonly number[] = [32, 37, 38, 39, 40]
