import { describe, expect, it } from 'vitest';

import { mandorCodecFor } from '../../src/mandor/mandor-codec.js';
import { mandorFormatFor } from '../../src/mandor/mandor-format.js';
import { fixtureText, SYNC_WORKSPACE } from './support/sample-workspace.js';

describe('the Mandor workspace as a format the app lists', () => {
    const format = mandorFormatFor('sync');

    it('names its files for the dialogs: it reads YAML, writes YAML, and goes by `mandor`', () => {
        expect(format.id).toBe('mandor');
        expect(format.label).toBe('Mandor');
        expect(format.reads).toEqual(['yaml', 'yml']);
        expect(format.writes).toEqual(['yaml']);
    });

    it('covers the whole workspace and asks the person for one file', () => {
        expect(format.scopes).toEqual(['workspace']);
        expect(format.input).toBe('file');
        expect(format.unwritten).toEqual({});
    });

    it('recognizes a bundle of either app, and one file only', () => {
        const text = fixtureText('async-workspace.mandor.yaml');

        expect(format.sniff([{ path: 'a.yaml', text }])).toBe(true);
        expect(format.sniff([{ path: 'a.yaml', text: 'openapi: 3.1.0\n' }])).toBe(false);
        expect(
            format.sniff([
                { path: 'a.yaml', text },
                { path: 'b.yaml', text },
            ]),
        ).toBe(false);
    });

    it('loads the codec of its own app: the bundle of the other one is refused', async () => {
        const codec = await format.load();
        const files = [{ path: 'a.yaml', text: fixtureText('async-workspace.mandor.yaml') }];

        await expect(codec.read(files, 'workspace')).rejects.toThrow(/async/u);
    });

    it('writes the workspace as a bundle of the app it was bound to, and the bundle as its text', () => {
        const codec = mandorCodecFor('sync');
        const [file] = codec.documentsOf(SYNC_WORKSPACE);

        expect(file?.document['app']).toBe('sync');
        expect(file === undefined ? '' : codec.textOf(file.document)).toMatch(
            /^mandor: workspace\n/u,
        );
    });
});
