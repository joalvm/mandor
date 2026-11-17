import { describe, expect, it } from 'vitest';

import { SEGMENT } from '../../src/id/segment-pattern.js';
import { formatResourceUri } from '../../src/resource/format-resource-uri.js';
import {
    APP_HOST,
    RESOURCE_KINDS,
    RESOURCE_URI_SCHEME,
    SETTINGS_PATH,
} from '../../src/resource/resource-uri-syntax.js';

describe('the grammar of a resource URI', () => {
    it('opens every resource with the scheme of the app', () => {
        expect(RESOURCE_URI_SCHEME).toBe('mandor://');
    });

    it('hosts the resources of the window where no repo can: an underscore is never an id', () => {
        expect(APP_HOST).toBe('_app');
        expect(SEGMENT.test(APP_HOST)).toBe(false);
    });

    it('keeps the settings of a repo at one fixed path, which is itself an id', () => {
        expect(SETTINGS_PATH).toBe('settings');
        expect(SEGMENT.test(SETTINGS_PATH)).toBe(true);
    });

    it('lists the nine kinds a workspace resource can be, each one an id', () => {
        expect([...RESOURCE_KINDS]).toEqual([
            'conflict',
            'connection',
            'doc',
            'environment',
            'example',
            'folder',
            'history',
            'item',
            'loose',
        ]);

        for (const kind of RESOURCE_KINDS) {
            expect(SEGMENT.test(kind)).toBe(true);
        }
    });

    it('writes each word of the grammar into the URI it builds', () => {
        const app = formatResourceUri({ scope: 'app', name: 'welcome' });
        const settings = formatResourceUri({ scope: 'settings', repo: 'mi-repo' });
        const doc = formatResourceUri({
            scope: 'workspace',
            repo: 'mi-repo',
            workspace: 'mi-ws',
            kind: 'doc',
            path: 'a.md',
        });

        expect(app).toBe(`${RESOURCE_URI_SCHEME}${APP_HOST}/welcome`);
        expect(settings).toBe(`${RESOURCE_URI_SCHEME}mi-repo/${SETTINGS_PATH}`);
        expect(doc).toBe(`${RESOURCE_URI_SCHEME}mi-repo/mi-ws/doc/a.md`);
    });
});
