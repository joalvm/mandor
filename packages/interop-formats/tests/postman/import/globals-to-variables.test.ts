import type { InteropDocument, InteropVariable } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { globalsToVariables } from '../../../src/postman/import/globals-to-variables.js';

function variable(name: string, value: string): InteropVariable {
    return { name, value, enabled: true, secret: false };
}

function documentWith(parts: Partial<InteropDocument>): InteropDocument {
    return { name: 'doc', ...parts } as InteropDocument;
}

function globalsOf(...variables: InteropVariable[]): InteropDocument {
    return documentWith({ environments: [{ name: 'Globals', variables, extras: {} }] });
}

describe('globals-to-variables: the variables of the workspace out of the globals', () => {
    it('takes the ones of the globals, in the order they came in', () => {
        expect(
            globalsToVariables([globalsOf(variable('a', '1')), globalsOf(variable('b', '2'))]),
        ).toEqual([variable('a', '1'), variable('b', '2')]);
    });

    it('lets the later file of globals win by name', () => {
        expect(
            globalsToVariables([
                globalsOf(variable('a', 'first')),
                globalsOf(variable('a', 'last')),
            ]),
        ).toEqual([variable('a', 'last')]);
    });

    it('makes nothing of the variables a document declares for itself', () => {
        const collection = documentWith({ variables: [variable('base', 'http://x.test')] });

        expect(globalsToVariables([collection])).toEqual([]);
    });

    it('says nothing of files that bring no variable', () => {
        expect(globalsToVariables([documentWith({})])).toEqual([]);
    });
});
