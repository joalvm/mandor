import { degradation, type Degradation, isRecord } from '@mandor/interop-core';

/** The dynamic variables of Postman that Mandor has under another name, or the same. */
const SUPPORTED = new Map([
    ['$guid', '$uuid'],
    ['$randomUUID', '$uuid'],
    ['$timestamp', '$timestamp'],
    ['$randomInt', '$randomInt'],
]);

const DYNAMIC = /\{\{(\$[A-Za-z]\w*)\}\}/g;

/**
 * The fields of a resource with their dynamic variables mapped, but not the scripts: those are
 * text. Every `{{$name}}` inside strings, arrays and plain objects is rewritten; a name Mandor does
 * not know stays as it is, and is noted once, in order of appearance.
 */
export function withDynamicFields<Fields extends Record<string, unknown>>(
    fields: Fields,
): {
    fields: Fields;
    notes: Degradation[];
} {
    const { scripts, ...rest } = fields;
    const unsupported: string[] = [];
    const value = rewrittenRecord(rest, unsupported);

    return {
        // A rewrite changes what a text says and never the shape around it.
        fields: (scripts === undefined ? value : { ...value, scripts }) as Fields,
        notes: unsupported.map((name) => degradation('dynamicVariableUnsupported', { name })),
    };
}

function rewritten(value: unknown, unsupported: string[]): unknown {
    if (typeof value === 'string') {
        return value.replace(DYNAMIC, (whole, name: string) => {
            const mapped = SUPPORTED.get(name);

            if (mapped === undefined) {
                return noted(whole, name, unsupported);
            }

            return `{{${mapped}}}`;
        });
    }

    if (Array.isArray(value)) {
        return value.map((each) => rewritten(each, unsupported));
    }

    if (isRecord(value)) {
        return rewrittenRecord(value, unsupported);
    }

    return value;
}

function rewrittenRecord(
    record: Record<string, unknown>,
    unsupported: string[],
): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(record).map(([key, each]) => [key, rewritten(each, unsupported)]),
    );
}

function noted(whole: string, name: string, unsupported: string[]): string {
    if (!unsupported.includes(name)) {
        unsupported.push(name);
    }

    return whole;
}
