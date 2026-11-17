import type { Environment } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { environmentEntries } from '../src/lib/environment-entries.js';

const LOCAL: Environment = {
    id: 'local',
    name: 'Local',
    variables: [
        { enabled: true, name: 'HOST', secret: false, value: 'localhost:8080' },
        { enabled: true, name: 'API_TOKEN', secret: true, value: 's3cr3t-v4lue' },
    ],
};

describe('building search entries from the environments', () => {
    it('makes one entry per environment and one per variable', () => {
        const entries = environmentEntries([LOCAL], 'Local', 'ws');

        expect(entries.map((each) => `${each.source}:${each.name}`)).toEqual([
            'environment:Local',
            'variable:HOST',
            'variable:API_TOKEN',
        ]);
    });

    it('points a variable at the resource of its environment', () => {
        const entries = environmentEntries([LOCAL], 'Local', 'ws');
        const variable = entries.find((each) => each.name === 'API_TOKEN');

        expect(variable?.resource).toBe('mandor://local/ws/environment/local');
        expect(variable?.trail).toBe('Local');
    });

    it('holds an environment by nothing: it hangs from no name, and never from its id', () => {
        const entries = environmentEntries([LOCAL], 'Local', 'ws');

        expect(entries[0]?.trail).toBe('');
    });

    it('never puts a value in an entry, so no search can reveal it', () => {
        const entries = environmentEntries([LOCAL], 'Local', 'ws');
        const text = entries.flatMap((each) => [each.name, each.trail, ...each.tags]).join('\n');

        expect(text).not.toContain('s3cr3t-v4lue');
        expect(text).not.toContain('localhost:8080');
    });
});
