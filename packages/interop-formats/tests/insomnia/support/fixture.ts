import { readFileSync } from 'node:fs';

/** The text of a file in `tests/insomnia/fixtures`, as the user would drop it. */
export function fixtureText(name: string): string {
    return readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8');
}

export function fixtureJson(name: string): unknown {
    return JSON.parse(fixtureText(name));
}
