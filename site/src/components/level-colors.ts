// The four crowd-level colours, indexed by CrowdLevel.rank.

export const LEVEL_DOT = ['bg-level-0', 'bg-level-1', 'bg-level-2', 'bg-level-3']

/** Classes that paint a Progress bar's filled part. */
export const LEVEL_BAR = [
  '[&>[data-slot=progress-indicator]]:bg-level-0',
  '[&>[data-slot=progress-indicator]]:bg-level-1',
  '[&>[data-slot=progress-indicator]]:bg-level-2',
  '[&>[data-slot=progress-indicator]]:bg-level-3',
]

/** The same colours as CSS values, for drawing. */
export const LEVEL_COLOR = ['var(--level-0)', 'var(--level-1)', 'var(--level-2)', 'var(--level-3)']
