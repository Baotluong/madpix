/** Every section is a square of this many logical units. */
export const SECTION = 1000;

/** How much of the previous section the next artist can see (fraction of its height). */
export const SLIVER = 0.1;

export const MIN_ARTISTS = 2;
export const MAX_ARTISTS = 4;

/** Converts a screen distance on a canvas of `sizePx` into section units. */
export const toUnits = (px: number, sizePx: number) => (px * SECTION) / sizePx;
