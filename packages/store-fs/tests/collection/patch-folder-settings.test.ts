import { describe, expect, it } from 'vitest';

import {
    absentWhenEmpty,
    patchFolderSettings,
} from '../../src/collection/patch-folder-settings.js';

const TEXT =
    '# a mano\nname: Pagos\nscripts:\n  onResponse:\n    source: pm.test()\nfuture: kept\n';
const HOST = { name: 'host', value: 'api.local', enabled: true, secret: false };

describe('patchFolderSettings', () => {
    it('writes the keys of the patch and keeps the scripts, the unknown key and the comments', () => {
        const text = patchFolderSettings(TEXT, { description: 'Todo', variables: [HOST] });

        expect(text).toContain('# a mano');
        expect(text).toContain('source: pm.test()');
        expect(text).toContain('future: kept');
        expect(text).toContain('description: Todo');
        expect(text).toContain('name: host');
    });

    it('takes a key out when the patch empties it', () => {
        const written = patchFolderSettings(TEXT, { description: 'Todo', variables: [HOST] });
        const emptied = patchFolderSettings(
            written,
            absentWhenEmpty({ description: '', variables: [] }),
        );

        expect(emptied).not.toContain('description');
        expect(emptied).not.toContain('variables');
        expect(emptied).toContain('future: kept');
    });

    it('refuses a secret: the file goes to git', () => {
        expect(() =>
            patchFolderSettings(TEXT, { variables: [{ ...HOST, secret: true }] }),
        ).toThrow();
    });
});

describe('absentWhenEmpty', () => {
    it('turns null, an empty text and an empty list into a removal, and leaves the rest', () => {
        expect(absentWhenEmpty({ description: null, variables: [HOST] })).toEqual({
            description: undefined,
            variables: [HOST],
        });
        expect(absentWhenEmpty({ description: '', variables: [] })).toEqual({
            description: undefined,
            variables: undefined,
        });
    });
});
