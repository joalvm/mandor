import { afterEach, describe, expect, it } from 'vitest';

import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { activeRepo } from '../../src/origin/active-repo.js';

afterEach(() => {
    setActiveOrigin(null);
});

describe('the active repo of a handler', () => {
    it('refuses with a bad request while the window is between origins', () => {
        const repo = activeRepo();

        expect(repo.ok).toBe(false);
        expect(repo).toMatchObject({ error: { code: 'bad-request' } });
    });

    it('answers the id that names its secrets and the root that holds its files', () => {
        setActiveOrigin({ id: 'team', kind: 'remote', name: 'Team', root: '/work/team' });

        expect(activeRepo()).toEqual({ ok: true, value: { id: 'team', root: '/work/team' } });
    });

    it('answers nothing more than those two, whatever the origin carries', () => {
        setActiveOrigin({
            id: 'team',
            kind: 'remote',
            name: 'Team',
            root: '/work/team',
            url: 'https://example.com/team.git',
        });

        expect(activeRepo()).toEqual({ ok: true, value: { id: 'team', root: '/work/team' } });
    });

    it('follows the origin the window moves to', () => {
        setActiveOrigin({ id: 'one', kind: 'remote', name: 'One', root: '/work/one' });
        setActiveOrigin({ id: 'two', kind: 'remote', name: 'Two', root: '/work/two' });

        expect(activeRepo()).toEqual({ ok: true, value: { id: 'two', root: '/work/two' } });
    });
});
