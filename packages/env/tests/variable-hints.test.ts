import { variableHints } from '../src/lib/variable-hints.js';
import { createEnvironment, type Environment } from '@mandor/schema';
import { describe, expect, it } from 'vitest';
import { windowScope } from '../src/lib/window-scope.js';

const environment: Environment = createEnvironment({
    id: 'local',
    name: 'local',
    variables: [
        { name: 'baseUrl', value: 'http://localhost:81/', enabled: true, secret: false },
        { name: 'token', value: 'abc', enabled: true, secret: true },
        { name: 'blank', value: '', enabled: true, secret: false },
    ],
});

describe('the hints of the suggested names', () => {
    it('shows the value of a declared variable, never that of a secret', () => {
        expect(variableHints(windowScope(environment, [], []), ['baseUrl', 'token'])).toEqual([
            { name: 'baseUrl', hint: 'http://localhost:81/' },
            { name: 'token' },
        ]);
    });

    it('shows no hint for a name with nothing to show', () => {
        expect(variableHints(windowScope(environment, [], []), ['blank'])).toEqual([
            { name: 'blank' },
        ]);
    });

    it('shows no hint without an environment to read from', () => {
        expect(variableHints(windowScope(undefined, [], []), ['baseUrl'])).toEqual([
            { name: 'baseUrl' },
        ]);
    });

    it('falls back to the workspace for a name the environment does not declare', () => {
        const workspace = [{ name: 'region', value: 'eu', enabled: true, secret: false }];

        expect(
            variableHints(windowScope(environment, workspace, []), ['region', 'baseUrl']),
        ).toEqual([
            { name: 'region', hint: 'eu' },
            { name: 'baseUrl', hint: 'http://localhost:81/' },
        ]);
    });

    it('lets the environment hint win over the workspace one', () => {
        const workspace = [{ name: 'baseUrl', value: 'other', enabled: true, secret: false }];

        expect(variableHints(windowScope(environment, workspace, []), ['baseUrl'])).toEqual([
            { name: 'baseUrl', hint: 'http://localhost:81/' },
        ]);
    });
});
