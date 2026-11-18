import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const STYLES_DIR = join(process.cwd(), 'packages', 'ui', 'src', 'styles');

export type ThemeMode = 'dark' | 'dark-contrast' | 'light' | 'light-contrast';
export type ThemeAccent = 'orange' | 'teal';
export type ThemeValues = Record<string, string>;

export async function cssOf(name: string): Promise<string> {
    return readFile(join(STYLES_DIR, name), 'utf8');
}

export function declarationsOf(css: string): ThemeValues {
    const declarations = [...css.matchAll(/--([\w-]+):\s*([^;]+);/g)];

    return Object.fromEntries(
        declarations.map((match) => {
            const [, name = '', value = ''] = match;

            return [name, value.trim()];
        }),
    );
}

function resolveValue(values: ThemeValues, name: string, seen: ReadonlySet<string>): string {
    const value = values[name];

    if (value === undefined) {
        throw new Error(`Missing token: ${name}`);
    }

    const reference = /^var\(--([\w-]+)\)$/.exec(value)?.[1];

    if (reference === undefined) {
        return value;
    }

    if (seen.has(reference)) {
        throw new Error(`Circular token: ${reference}`);
    }

    return resolveValue(values, reference, new Set([...seen, reference]));
}

/**
 * The accent steps point at the ramp the root of the window names. The stylesheet decides it by
 * selector, which a flat list of declarations cannot read, so the ramp is named here instead.
 */
function withAccent(values: ThemeValues, accent: ThemeAccent): ThemeValues {
    return Object.fromEntries(
        Object.entries(values).map(([name, value]) => {
            const step = /^primitive-accent-(.+)$/.exec(name)?.[1];

            return [name, step === undefined ? value : `var(--primitive-${accent}-${step})`];
        }),
    );
}

/** The declarations of the block a theme names in the stylesheet of the high-contrast themes. */
function contrastBlockOf(css: string, theme: string): ThemeValues {
    const block = new RegExp(String.raw`\[data-theme='${theme}'\]\s*{([^}]*)}`).exec(css)?.[1];

    if (block === undefined) {
        throw new Error(`Missing theme block: ${theme}`);
    }

    return declarationsOf(block);
}

/**
 * What a theme declares: the dark ones start from the dark sheet and the light ones from the
 * light sheet, and a high-contrast one is its scheme with the tokens it raises laid over it.
 */
async function semanticOf(mode: ThemeMode): Promise<ThemeValues> {
    const dark = mode.startsWith('dark');
    const base = declarationsOf(await cssOf(dark ? 'semantic-dark.css' : 'semantic.css'));

    if (!mode.endsWith('-contrast')) {
        return base;
    }

    return { ...base, ...contrastBlockOf(await cssOf('semantic-contrast.css'), mode) };
}

export async function themeOf(mode: ThemeMode, accent: ThemeAccent = 'teal'): Promise<ThemeValues> {
    const primitiveValues = withAccent(declarationsOf(await cssOf('primitives.css')), accent);
    const semanticValues = await semanticOf(mode);
    const values = { ...primitiveValues, ...semanticValues };

    return Object.fromEntries(
        Object.keys(semanticValues).map((name) => [name, resolveValue(values, name, new Set())]),
    );
}
