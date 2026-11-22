import type { Game } from './types';

/** Every strip is this many logical units wide. */
export const STRIP_W = 1000;

/**
 * Strips are 2:1, like a page folded into wide bands. The finished page comes
 * out square for 2 artists, 2:3 for 3 and 1:2 for 4.
 */
export const STRIP_H = 500;

/** Games saved before strips were 2:1 used square strips. */
const LEGACY_STRIP_H = 1000;

/** Strip height (in units) for a given game. */
export const stripHeight = (game: Game) => game.stripH ?? LEGACY_STRIP_H;

/** How much of the previous strip the next artist can see (fraction of its height). */
export const SLIVER = 0.15;

export const MIN_ARTISTS = 2;
export const MAX_ARTISTS = 4;
