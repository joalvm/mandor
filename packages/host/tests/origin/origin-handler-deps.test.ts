import { describe, expect, it } from 'vitest';

import type { OriginHandlerDeps } from '../../src/origin/origin-handler-deps.js';
import { silentReporting } from '../../src/testing/handler-harness.js';

describe('the deps of the origin handlers', () => {
    it('carries the kind of the app, the user directory and what reports unreadable files', () => {
        const deps: OriginHandlerDeps = {
            kind: 'async',
            userDataDir: '/users/ana/mandor',
            ...silentReporting(),
        };

        expect(Object.keys(deps).sort()).toEqual(['kind', 'logger', 'notices', 'userDataDir']);
    });
});
