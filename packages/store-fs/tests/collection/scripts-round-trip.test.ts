import { folderSettingsSchema } from '@mandor/schema';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

import {
    absentWhenEmpty,
    patchFolderSettings,
} from '../../src/collection/patch-folder-settings.js';

// A right-to-left mark and a zero width space hide in this text: review has to see them as they are.
const SOURCE = "// \u202E hidden \u200B here\nvars.set('a', 1);\n\nif (ok) {\n    go();\n}\n";
const TEXT = '# a mano\nname: Pagos\n# del vecino\ndescription: algo\nfuture: kept\n';

function written(): string {
    return patchFolderSettings(TEXT, { scripts: { onBeforeRequest: { source: SOURCE } } });
}

describe('the scripts in a file of settings', () => {
    it('come back with the same text, hidden characters included', () => {
        const read = folderSettingsSchema.parse(parse(written()));

        expect(read.scripts?.onBeforeRequest?.source).toBe(SOURCE);
    });

    it('go in beside the comments and the keys that were there', () => {
        const text = written();

        expect(text).toContain('# a mano');
        expect(text).toContain('# del vecino');
        expect(text).toContain('description: algo');
        expect(text).toContain('future: kept');
        expect(text).toContain('scripts:');
    });

    it('keep their switch and an event this version does not know', () => {
        // A file of a later version: the variable keeps the type from checking the extra event.
        const later = {
            onResponse: { source: 'a()', enabled: false },
            onFuture: { source: 'b()' },
        };
        const text = patchFolderSettings(TEXT, { scripts: later });

        expect(parse(text)).toMatchObject({ scripts: later });
    });

    it('leave the file when the window sends null', () => {
        const emptied = patchFolderSettings(written(), absentWhenEmpty({ scripts: null }));

        expect(emptied).not.toContain('scripts');
        expect(emptied).toContain('# del vecino');
    });

    it('are not taken for empty when they are an empty map: the window sends null to empty', () => {
        expect(absentWhenEmpty({ scripts: {} })).toEqual({ scripts: {} });
    });
});
