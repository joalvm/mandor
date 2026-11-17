import { parseResourceUri, slugify } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { environmentResource } from '../src/lib/environment-resource.js';

describe('the resource an environment is opened as', () => {
    it('names the environment inside its workspace, under the slug of the origin', () => {
        expect(environmentResource('Team Origin', 'payments', 'staging')).toBe(
            `mandor://${slugify('Team Origin')}/payments/environment/staging`,
        );
    });

    it('reads back into the parts it was written from', () => {
        expect(parseResourceUri(environmentResource('Local', 'payments', 'staging'))).toEqual({
            scope: 'workspace',
            repo: slugify('Local'),
            workspace: 'payments',
            kind: 'environment',
            path: 'staging',
        });
    });

    it('writes the same text for the same environment, so two views compare equal', () => {
        expect(environmentResource('Local', 'payments', 'staging')).toBe(
            environmentResource('Local', 'payments', 'staging'),
        );
        expect(environmentResource('Local', 'payments', 'staging')).not.toBe(
            environmentResource('Local', 'payments', 'local'),
        );
    });
});
