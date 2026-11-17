import { FormatInputError, type InteropFormat } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { answerRead, serveImportReads } from '../../src/import/serve-import-reads.js';
import { fixtureFormat, fixtureText } from '../interop/fixture-format.js';

function refusing(error: Error): InteropFormat {
    return {
        ...fixtureFormat,
        load: async () => ({
            ...(await fixtureFormat.load()),
            read: () => Promise.reject(error),
        }),
    };
}

const files = [{ path: 'p.json', text: fixtureText('pasarela-3') }];

describe('the worker side of an import', () => {
    it('reads the files with the format the request names', async () => {
        const reply = await answerRead([fixtureFormat], {
            formatId: fixtureFormat.id,
            files,
            scope: 'workspace',
        });

        expect(reply.kind).toBe('read');
    });

    it('sends the refusal of a format as its problems', async () => {
        const reply = await answerRead([refusing(new FormatInputError(['a', 'b']))], {
            formatId: fixtureFormat.id,
            files,
            scope: 'workspace',
        });

        expect(reply).toEqual({ kind: 'refused', problems: ['a', 'b'] });
    });

    it('sends any other fault as its message', async () => {
        const reply = await answerRead([refusing(new Error('broke'))], {
            formatId: fixtureFormat.id,
            files,
            scope: 'workspace',
        });

        expect(reply).toEqual({ kind: 'failed', message: 'broke' });
    });

    it('fails a format it does not list', async () => {
        const reply = await answerRead([], { formatId: 'other', files, scope: 'workspace' });

        expect(reply).toEqual({
            kind: 'failed',
            message: 'the import worker lists no format other',
        });
    });

    it('does nothing on the main thread, where there is no parent to answer', () => {
        expect(() => {
            serveImportReads([fixtureFormat]);
        }).not.toThrow();
    });
});
