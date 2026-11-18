import { isRecord } from '@mandor/interop-core';

function filled(value: unknown): boolean {
    if (Array.isArray(value)) {
        return value.length > 0;
    }

    if (isRecord(value)) {
        return Object.keys(value).length > 0;
    }

    return typeof value === 'string' ? value.trim() !== '' : value === true;
}

/** The names, from the parts a level keeps, of the ones that hold something Mandor cannot. */
export function leftOutOf(parts: Record<string, unknown>): string[] {
    return Object.entries(parts)
        .filter(([, value]) => filled(value))
        .map(([name]) => name);
}
