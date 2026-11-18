import type { RequestLine } from '@mandor/schema';

/** The value of the first header with that name, whatever its case, or null if none. */
export function headerValue(headers: readonly RequestLine[], name: string): string | null {
    const wanted = name.toLowerCase();

    return headers.find((header) => header.key.toLowerCase() === wanted)?.value ?? null;
}
