import type { RequestExample } from '@mandor/schema';

/** What an example is chosen by: its status, its type and its name, the ones it has. */
export function exampleTitle(example: RequestExample): string {
    return [example.status, example.contentType, example.name]
        .filter((part) => part !== '')
        .join(' · ');
}
