# One-page game design

> Fill this in before writing production code. Keep it to one page. If a field
> is unknown, write the assumption and mark it as open.

## Identity

- **id** (kebab-case, stable):
- **中文名**:
- **English name**:
- **One-line pitch**:
- **Genre / reference**:
- **Target session** (e.g. 2–5 min):

## Core loop

- **Player repeats** (the 30-second loop):
- **Win condition**:
- **Lose condition**:
- **Retry cost**:
- **First playable** (what happens in the first 10 seconds):

## Controls and layout

- **Input** (keyboard / pointer / touch / gamepad):
- **Orientation** (portrait / landscape / both):
- **Mobile specifics** (swipe, virtual joystick, tap targets):

## Progression

- **Score / currency**:
- **Difficulty knobs** (names + ranges):
- **Unlocks / levels**:
- **Persistence** (best score, stars, coins, settings):

## Monetization (optional)

- **Ad placements** (menu / death / result):
- **Reward per placement**:
- **Gameplay caps** (e.g. one revive per run):
- **Standard path** (what the player can always do without ads):

## Save schema (version 1)

```ts
interface SaveV1 {
  // only the fields the game actually needs
}
```

- **Migration plan** (how v1 becomes v2 later):

## Content and assets

- **Levels / content count**:
- **Art source** (procedural placeholder first, then CC0/OFL):
- **Audio source**:
- **Licenses** (file names / URLs):
- **Fonts** (system stack for Chinese; OFL for Latin):

## Acceptance criteria

Write 5–10 testable statements. These become the QA matrix.
1.
2.
3.
4.
5.

## Out of scope

-
