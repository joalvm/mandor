import { createEnvironment } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { initialEnvSlice } from '../src/env.slice.js';

describe('the environment state a window starts with', () => {
    it('knows no environment, no globals, no default and no error', () => {
        expect(initialEnvSlice()).toEqual({
            activeEnvironmentIds: {},
            environments: [],
            error: null,
            folderChains: {},
            defaultEnvironmentIds: {},
            globals: [],
            scriptVariables: {},
        });
    });

    /** A store that wrote into a shared start would leak one window's state into the next. */
    it('hands a fresh start every time', () => {
        const first = initialEnvSlice();

        first.environments.push(createEnvironment({ id: 'local', name: 'Local' }));
        first.activeEnvironmentIds['payments'] = 'local';

        expect(initialEnvSlice().environments).toEqual([]);
        expect(initialEnvSlice().activeEnvironmentIds).toEqual({});
    });
});
