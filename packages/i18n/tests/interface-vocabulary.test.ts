import { describe, expect, it } from 'vitest';

import { RESOURCES } from '../src/generated/resources.js';
import { INTERFACE_VOCABULARY } from './support/interface-vocabulary.js';

/** No string of the interface leaks a path of this machine. */
const ABSOLUTE_PATH = /[A-Za-z]:[\\/]|\/(Users|home|var|tmp|etc)\//;

function stringsOf(value: unknown, at: string): [string, string][] {
    if (typeof value === 'string') {
        return [[at, value]];
    }

    if (typeof value === 'object' && value !== null) {
        return Object.entries(value).flatMap(([key, inner]) => stringsOf(inner, `${at}.${key}`));
    }

    return [];
}

function offenders(matching: RegExp): string[] {
    return Object.entries(RESOURCES).flatMap(([language, namespaces]) =>
        stringsOf(namespaces, language)
            .filter(([, text]) => matching.test(text))
            .map(([at, text]) => `${at}: ${text}`),
    );
}

describe('the interface vocabulary', () => {
    it('never names the version control underneath', () => {
        expect(offenders(INTERFACE_VOCABULARY)).toEqual([]);
    });

    it('never shows an absolute path of the machine', () => {
        expect(offenders(ABSOLUTE_PATH)).toEqual([]);
    });
});
