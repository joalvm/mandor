import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The text of a fixture document, as the user would hand it to the import. */
export function fixtureText(fixture: string): string {
    return readFileSync(fileURLToPath(new URL(`../fixtures/${fixture}`, import.meta.url)), 'utf8');
}
