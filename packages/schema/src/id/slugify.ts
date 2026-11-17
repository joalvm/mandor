import { IdError } from './id-error.js';
import { MAX_SEGMENT_LENGTH } from './segment.js';
import { SEGMENT } from './segment-pattern.js';

/** What an id may hold besides the hyphen: the letters and digits of `SEGMENT`, and marks. */
const NOT_IN_ID = /[^\p{Ll}\p{Lm}\p{Lo}\p{M}\p{Nd}]+/gu;

const LATIN_OR_DIGIT = /^[a-z0-9]+$/i;

const BYTES = new TextEncoder();

/**
 * Derives the initial id from the visible name. Ids already in use are passed in `taken`
 * and get a numeric suffix, so two workspaces named alike never collide.
 */
export function slugify(name: string, taken: readonly string[] = []): string {
    const base = slugBase(name);
    const occupied = new Set(taken);

    if (SEGMENT.test(base) && !occupied.has(base)) {
        return base;
    }

    return freeSuffix(base, occupied);
}

function slugBase(name: string): string {
    const slug = Array.from(name.normalize('NFC'), plainLetter)
        .join('')
        .toLowerCase()
        .normalize('NFC')
        .replace(NOT_IN_ID, '-')
        .replace(/^-+|-+$/g, '');

    if (slug === '') {
        throw new IdError(name);
    }

    return withinBytes(slug, MAX_SEGMENT_LENGTH);
}

/**
 * A letter that is a Latin letter or digit under its accent or its width (`ñ`, `Ｐ`, `①`)
 * becomes that plain letter, as it always has; a letter of another alphabet stays as it is,
 * since stripping its marks would turn it into another letter (`が` is not `か`).
 */
function plainLetter(letter: string): string {
    const bare = letter.normalize('NFKD').replace(/\p{M}/gu, '');

    return LATIN_OR_DIGIT.test(bare) ? bare : letter;
}

/** The longest start of the id that fits the bytes, never cutting a letter in two. */
function withinBytes(id: string, budget: number): string {
    let used = 0;
    let kept = '';

    for (const letter of id) {
        used += BYTES.encode(letter).length;

        if (used > budget) {
            break;
        }

        kept += letter;
    }

    return kept;
}

function freeSuffix(base: string, occupied: ReadonlySet<string>): string {
    let counter = 2;
    let candidate = suffixed(base, counter);

    while (occupied.has(candidate)) {
        counter += 1;
        candidate = suffixed(base, counter);
    }

    return candidate;
}

function suffixed(base: string, counter: number): string {
    const suffix = `-${String(counter)}`;

    return `${withinBytes(base, MAX_SEGMENT_LENGTH - suffix.length)}${suffix}`;
}
