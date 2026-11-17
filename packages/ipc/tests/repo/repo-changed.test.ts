import { describe, expect, it } from 'vitest';

import { conflictRecordedPushSchema, repoChangedPushSchema } from '../../src/repo/repo-changed.js';

describe('repo:changed push', () => {
    it('carries the entities that changed, never paths', () => {
        const push = {
            changes: [{ area: 'collections', workspaceId: 'pagos', path: 'auth/login' }],
        };

        expect(repoChangedPushSchema.parse(push)).toEqual(push);
    });

    it('refuses a path where an entity should be', () => {
        expect(repoChangedPushSchema.safeParse({ changes: ['workspaces/a'] }).success).toBe(false);
    });
});

describe('conflict:recorded push', () => {
    it('names the entity the clash belongs to and the name its file carries', () => {
        const push = {
            entity: { area: 'environment', workspaceId: 'pagos', id: 'prod' },
            name: 'Producción',
        };

        expect(conflictRecordedPushSchema.parse(push)).toEqual(push);
    });

    it('carries an empty name for a file that has none', () => {
        const push = { entity: { area: 'repo' }, name: '' };

        expect(conflictRecordedPushSchema.parse(push)).toEqual(push);
    });

    it('refuses a push with no name, and extra keys', () => {
        expect(conflictRecordedPushSchema.safeParse({ entity: { area: 'repo' } }).success).toBe(
            false,
        );
        expect(
            conflictRecordedPushSchema.safeParse({
                entity: { area: 'repo' },
                name: '',
                path: 'a.yaml',
            }).success,
        ).toBe(false);
    });
});
