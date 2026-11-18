import { afterEach, describe, expect, it } from 'vitest';

import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { activeRoot } from '../../src/origin/active-root.js';

afterEach(() => {
    setActiveOrigin(null);
});

describe('the active root of a handler', () => {
    it('refuses with the same bad request while the window is between origins', () => {
        const root = activeRoot();

        expect(root.ok).toBe(false);
        expect(root).toMatchObject({ error: { code: 'bad-request' } });
    });

    it('answers the directory of the active origin and nothing else', () => {
        setActiveOrigin({ id: 'team', kind: 'remote', name: 'Team', root: '/work/team' });

        expect(activeRoot()).toEqual({ ok: true, value: '/work/team' });
    });
});
