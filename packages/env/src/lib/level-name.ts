import type { Environment } from '@mandor/schema';
import type { TracedLevel } from '@mandor/vars';

/** The word for a level without a name of its own, as a key of the environment texts. */
const LEVEL_WORDS = {
    script: 'levelScript',
    folder: 'levelFolder',
    environment: 'levelEnvironment',
    collection: 'levelCollection',
    globals: 'levelGlobals',
    dynamic: 'levelDynamic',
} as const satisfies Record<TracedLevel['level'], string>;

export type LevelWord = (typeof LEVEL_WORDS)[keyof typeof LEVEL_WORDS];

/**
 * How a person reads a level: a collection or a folder by its name, the environment by its
 * own, the rest by what they are. Never a path.
 */
export function levelName(
    level: TracedLevel,
    environment: Environment | undefined,
    word: (key: LevelWord) => string,
): string {
    if (level.label !== undefined) {
        return level.label;
    }

    if (level.level === 'environment' && environment !== undefined) {
        return environment.name;
    }

    return word(LEVEL_WORDS[level.level]);
}
