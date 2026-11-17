import type { RequestLine } from '../request/request-line.js';

/** Who sends its own line instead of an inherited one: the request, or a closer level by name. */
export type HeaderOverride = { by: 'request' } | { by: 'level'; name: string };

/** A line a level of the chain hands down, the name of that level, and who overrides it. */
export type InheritedHeader = {
    line: RequestLine;
    /** The visible name of the level that declared it: never its path. */
    label: string;
    overriddenBy?: HeaderOverride | undefined;
};

/** What the chain hands down to a request, and the lines that go out once it is merged. */
export type HeaderInheritance = {
    /** Every inherited line that counts, the farthest level first. */
    inherited: InheritedHeader[];
    /** The inherited lines nobody overrides, then the request's own, as written. */
    sent: RequestLine[];
};

/** All the chain has to say of the headers: a visible name, and the lines it declares. */
type HeaderLevel = { name: string; settings: { headers?: readonly RequestLine[] | undefined } };

type Declared = { line: RequestLine; label: string; distance: number };

/** A line that counts: switched on and named. Any other is neither inherited nor an override. */
function counts(line: RequestLine): boolean {
    return line.enabled && line.key !== '';
}

function nameOf(line: RequestLine): string {
    return line.key.toLowerCase();
}

/** The lines of the chain, the farthest level first, each with how far from the request it is. */
function declaredIn(levels: readonly HeaderLevel[]): Declared[] {
    return levels
        .flatMap((level, distance) =>
            (level.settings.headers ?? [])
                .filter(counts)
                .map((line) => ({ line, label: level.name, distance })),
        )
        .sort((one, other) => other.distance - one.distance);
}

/**
 * Who overrides a line: the request when it writes the name, else the closest level nearer than
 * the line's own that declares it. The declared lines go the farthest first, so the last is closest.
 */
function overrideOf(
    entry: Declared,
    own: ReadonlySet<string>,
    declared: readonly Declared[],
): HeaderOverride | undefined {
    const name = nameOf(entry.line);

    if (own.has(name)) {
        return { by: 'request' };
    }

    const winner = declared
        .filter((other) => nameOf(other.line) === name && other.distance < entry.distance)
        .at(-1);

    return winner === undefined ? undefined : { by: 'level', name: winner.label };
}

function headerOf(
    entry: Declared,
    own: ReadonlySet<string>,
    declared: readonly Declared[],
): InheritedHeader {
    const { line, label } = entry;
    const overriddenBy = overrideOf(entry, own, declared);

    return overriddenBy === undefined ? { line, label } : { line, label, overriddenBy };
}

/**
 * The headers a request inherits from the levels above it, `levels` the closest first as the
 * chain is read. By name, whatever the case, the closest level wins and the request's own line
 * wins over every level; repeated lines of one level all go, in their order; a disabled line is
 * neither inherited nor overrides. Main sends with it and the window paints with it, so what is
 * shown is what goes out.
 */
export function inheritedHeaders(
    levels: readonly HeaderLevel[],
    own: readonly RequestLine[],
): HeaderInheritance {
    const declared = declaredIn(levels);
    const ownNames = new Set(own.filter(counts).map(nameOf));
    const inherited = declared.map((entry) => headerOf(entry, ownNames, declared));
    const standing = inherited.filter((header) => header.overriddenBy === undefined);

    return { inherited, sent: [...standing.map((header) => header.line), ...own] };
}
