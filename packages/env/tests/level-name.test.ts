import { createEnvironment } from '@mandor/schema';
import type { VariableTrace } from '@mandor/vars';
import { describe, expect, it } from 'vitest';

import { inheritedTrace } from '../src/lib/inherited-trace.js';
import { levelName } from '../src/lib/level-name.js';

const PROD = createEnvironment({ id: 'prod', name: 'Prod', variables: [] });

function word(key: string): string {
    return `<${key}>`;
}

describe('the name of a level as a person reads it', () => {
    it('calls a collection or a folder by its name, never by its path', () => {
        expect(levelName({ level: 'folder', label: 'Pagos' }, PROD, word)).toBe('Pagos');
    });

    it('calls the environment by its own name, and the rest by what they are', () => {
        expect(levelName({ level: 'environment' }, PROD, word)).toBe('Prod');
        expect(levelName({ level: 'environment' }, undefined, word)).toBe('<levelEnvironment>');
        expect(levelName({ level: 'globals' }, PROD, word)).toBe('<levelGlobals>');
    });
});

describe('the trace the popover reads without editing', () => {
    it('is the one some level other than the environment wins', () => {
        const fromFolder: VariableTrace = {
            winner: { level: 'folder', label: 'Pagos', value: 'x', secret: false },
            shadowed: [],
        };

        expect(inheritedTrace(fromFolder)).toBe(fromFolder);
        expect(
            inheritedTrace({
                winner: { level: 'environment', value: 'x', secret: false },
                shadowed: [],
            }),
        ).toBeUndefined();
        expect(inheritedTrace(undefined)).toBeUndefined();
    });
});
