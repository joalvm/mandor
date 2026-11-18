import { describe, expect, it } from 'vitest';

import { carriedBy, holdsSettings, settingsPatchOf } from '../../src/import/carried-settings.js';
import { ownFingerprint, ownFolderFingerprint } from '../../src/import/own-collection.js';
import { folderEntry } from './support/folder-entry.js';

const SCRIPTS = { onBeforeRequest: { source: 'a()' } };

describe('the own scripts an entry carries', () => {
    it('are read the way the file reads them', () => {
        expect(carriedBy(folderEntry('demo/a', 'A', { scripts: SCRIPTS })).scripts).toEqual(
            SCRIPTS,
        );
        expect(carriedBy(folderEntry('demo/a', 'A')).scripts).toEqual({});
    });

    it('refuse a text that is no script', () => {
        expect(() =>
            carriedBy(folderEntry('demo/a', 'A', { scripts: { onResponse: { source: 1 } } })),
        ).toThrow();
    });

    it('go into the write of the level, and leave no key when there are none', () => {
        const withScripts = settingsPatchOf(
            carriedBy(folderEntry('demo/a', 'A', { scripts: SCRIPTS })),
        );

        expect(withScripts.scripts).toEqual(SCRIPTS);
        expect(settingsPatchOf(carriedBy(folderEntry('demo/a', 'A'))).scripts).toBeUndefined();
    });

    it('make a level hold settings', () => {
        expect(holdsSettings({ scripts: SCRIPTS })).toBe(true);
        expect(holdsSettings({ scripts: {} })).toBe(false);
    });

    it('change the hash of what the import owns', () => {
        expect(ownFolderFingerprint({ scripts: SCRIPTS })).not.toBe(ownFolderFingerprint({}));
        expect(ownFingerprint({ name: 'Uno', scripts: SCRIPTS })).not.toBe(
            ownFingerprint({ name: 'Uno' }),
        );
    });
});
