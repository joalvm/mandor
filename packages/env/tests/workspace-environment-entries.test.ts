import type { Environment } from '@mandor/schema';
import { afterEach, describe, expect, it } from 'vitest';

import { envStore } from '../src/env-store.js';
import { environmentEntries } from '../src/lib/environment-entries.js';
import { workspaceEnvironmentEntries } from '../src/lib/workspace-environment-entries.js';

const STAGING: Environment = {
    id: 'staging',
    name: 'Staging',
    variables: [{ enabled: true, name: 'HOST', secret: false, value: 'staging.test' }],
};

function say(key: string): string {
    return `dicho ${key}`;
}

afterEach(() => {
    envStore.getState().reset();
});

describe('the environments the search of a workspace finds', () => {
    it('are the environments the store holds, under the origin and workspace it is asked for', () => {
        envStore.setState({ environments: [STAGING] });

        expect(workspaceEnvironmentEntries('Local', 'ws', say)).toEqual(
            environmentEntries([STAGING], 'Local', 'ws'),
        );
    });

    it('name a global under the word the window says for them', () => {
        envStore.setState({ globals: STAGING.variables });

        const [entry] = workspaceEnvironmentEntries('Local', 'ws', say);

        expect(entry?.trail).toBe('dicho environment:globals');
    });

    it('are none while the store holds no environment', () => {
        expect(workspaceEnvironmentEntries('Local', 'ws', say)).toEqual([]);
    });
});
