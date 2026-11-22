/**
 * Default artist names for the lazy: a painter (or an arty word) and an animal that
 * start with the same letter, like "Picasso Platypus" or "Doodling Dolphin".
 * Names are only labels, so they don't need to be unique.
 */
const FIRST = [
  'Banksy', 'Brushy', 'Botticelli', 'Crayon', 'Cezanne', 'Charcoal', 'Dali', 'Degas', 'Doodling', 'Dotty',
  'Frida', 'Fingerpaint', 'Goya', 'Glitter', 'Hokusai', 'Inky', 'Klimt', 'Kahlo', 'Matisse', 'Monet',
  'Messy', 'Magritte', 'Picasso', 'Pastel', 'Pollock', 'Renoir', 'Rembrandt', 'Rothko', 'Sketchy',
  'Scribbly', 'Smudgy', 'Seurat', 'Squiggly', 'Turner', 'Vermeer', 'Van Gogh', 'Warhol', 'Wobbly',
];

const ANIMALS = [
  'Badger', 'Bat', 'Beaver', 'Bunny', 'Bison', 'Cat', 'Camel', 'Cheetah', 'Crab', 'Chipmunk', 'Dodo',
  'Dolphin', 'Duck', 'Dingo', 'Ferret', 'Flamingo', 'Frog', 'Fox', 'Gecko', 'Goose', 'Gorilla',
  'Giraffe', 'Hedgehog', 'Hippo', 'Hamster', 'Iguana', 'Ibis', 'Koala', 'Kangaroo', 'Kiwi', 'Kitten',
  'Moose', 'Meerkat', 'Mole', 'Monkey', 'Panda', 'Penguin', 'Platypus', 'Puffin', 'Pug', 'Rhino',
  'Raccoon', 'Rabbit', 'Robin', 'Seal', 'Sloth', 'Squid', 'Snail', 'Swan', 'Turtle', 'Toucan',
  'Tiger', 'Vulture', 'Vole', 'Walrus', 'Wombat', 'Weasel', 'Whale',
];

/** Max name length the API accepts. */
const MAX = 20;

const byLetter = (words: string[]) => {
  const map = new Map<string, string[]>();
  for (const w of words) map.set(w[0], [...(map.get(w[0]) ?? []), w]);
  return map;
};
const firsts = byLetter(FIRST);
const animals = byLetter(ANIMALS);
const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];

const PAIRS = [...firsts.keys()]
  .filter((letter) => animals.has(letter))
  .flatMap((letter) =>
    firsts.get(letter)!.flatMap((f) => animals.get(letter)!.map((a) => `${f} ${a}`)),
  )
  .filter((name) => name.length <= MAX);

/** A random name, different from `not` if given. */
/** A random name that isn't `not` (one name, or the names already taken). */
export function randomArtistName(not?: string | string[]): string {
  const taken = new Set(typeof not === 'string' ? [not] : (not ?? []));
  let name = pick(PAIRS);
  for (let tries = 0; taken.has(name) && tries < 50; tries++) name = pick(PAIRS);
  return name;
}

/** `count` different random names, for a table of artists. */
export function randomArtistNames(count: number): string[] {
  const names: string[] = [];
  while (names.length < count) names.push(randomArtistName(names));
  return names;
}
