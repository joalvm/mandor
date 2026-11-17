import { describe, expect, it } from 'vitest';

import { connectionDeleteRequestSchema } from '../../src/connection/connection-delete.js';

describe('connectionDeleteRequestSchema', () => {
    it('names the workspace and the connection', () => {
        const request = { workspaceId: 'eventos', connectionId: 'gateway' };

        expect(connectionDeleteRequestSchema.parse(request)).toEqual(request);
    });

    it('refuses a connection id that is not one id segment', () => {
        const result = connectionDeleteRequestSchema.safeParse({
            workspaceId: 'eventos',
            connectionId: '../gateway',
        });

        expect(result.success).toBe(false);
    });

    it('refuses a request with no connection', () => {
        expect(connectionDeleteRequestSchema.safeParse({ workspaceId: 'eventos' }).success).toBe(
            false,
        );
    });
});
