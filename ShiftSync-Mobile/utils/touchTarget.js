const minimumTarget = { minWidth: 48, minHeight: 48 };
// Enlarge the layout box itself, avoiding overlapping invisible hitSlop targets.
export const ensureTouchTarget = (style) => typeof style === 'function'
  ? (state) => [style(state), minimumTarget]
  : [style, minimumTarget];
