const FAMILY = /^([1-5])XX$/i;

/**
 * Whether the status an example stands for covers the one that came: `default` covers any, `2XX`
 * its family, and a code only itself. The way OpenAPI writes the status of a response.
 */
export function statusMatches(expected: string, received: number): boolean {
    if (expected.toLowerCase() === 'default') {
        return true;
    }

    const family = FAMILY.exec(expected)?.[1];

    if (family !== undefined) {
        return String(received).startsWith(family);
    }

    return expected === String(received);
}
