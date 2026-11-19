/**
 * Optional "inspo" words. Mostly animals, since everyone can draw those,
 * plus a few easy things. Every artist gets the same word, but nobody knows
 * which part of it they're drawing.
 */
export const PROMPTS = [
  // Animals
  'elephant',
  'cat',
  'dog',
  'fish',
  'giraffe',
  'snake',
  'owl',
  'frog',
  'pig',
  'cow',
  'horse',
  'rabbit',
  'bear',
  'lion',
  'monkey',
  'penguin',
  'duck',
  'octopus',
  'turtle',
  'crocodile',
  'shark',
  'spider',
  'snail',
  'bat',
  'dinosaur',
  'dragon',
  'unicorn',
  'mouse',
  'chicken',
  'whale',
  // Things and people
  'robot',
  'pirate',
  'astronaut',
  'wizard',
  'snowman',
  'superhero',
  'ghost',
  'alien',
  'mermaid',
  'tree',
  'house',
  'rocket',
];

export function randomPrompt(exclude?: string | null): string {
  const pool = exclude ? PROMPTS.filter((p) => p !== exclude) : PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)];
}
