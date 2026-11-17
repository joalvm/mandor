import { formatResourceUri } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    connectionIdOf,
    connectionResource,
} from '../../../../../src/renderer/features/connections/lib/connection-resource.js';

describe('where a connection lives', () => {
    it('names the connection by the workspace and the origin it belongs to', () => {
        expect(connectionResource('Local APIs', 'events', 'echo')).toBe(
            'mandor://local-apis/events/connection/echo',
        );
    });

    it('gives back the id the resource was built from', () => {
        const resource = connectionResource('Local APIs', 'events', 'echo');

        expect(connectionIdOf(resource)).toBe('echo');
    });

    it('names no connection in a resource of any other kind', () => {
        const request = formatResourceUri({
            scope: 'workspace',
            repo: 'local-apis',
            workspace: 'events',
            kind: 'environment',
            path: 'dev',
        });

        expect(connectionIdOf(request)).toBe('');
    });
});
