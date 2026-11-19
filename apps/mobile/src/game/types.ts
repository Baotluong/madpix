/**
 * Core game data. Drawings are stored as vector strokes (not pixels) so they
 * stay small, scale to any screen, and can be replayed later.
 *
 * Coordinates are in "section units": every section is a SECTION x SECTION
 * square (see geometry.ts), regardless of the device it was drawn on.
 */

export type Stroke = {
  color: string;
  /** Line width in section units. */
  width: number;
  /** Flat list of points: [x0, y0, x1, y1, ...] in section units. */
  points: number[];
};

export type Section = {
  artist: string;
  strokes: Stroke[];
};

export type Game = {
  id: string;
  createdAt: number;
  finishedAt?: number;
  artists: string[];
  /** Optional shared inspiration word. Everyone gets the same one. */
  prompt: string | null;
  /** Finished sections, top to bottom. */
  sections: Section[];
  /** Strokes of the section being drawn now, saved so a crash doesn't lose a turn. */
  draft: Stroke[];
};

/** Index of the artist whose turn it is (equals artists.length when finished). */
export const currentTurn = (game: Game) => game.sections.length;

export const isFinished = (game: Game) => game.sections.length >= game.artists.length;
