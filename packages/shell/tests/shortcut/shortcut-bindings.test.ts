import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerCommand } from '../../src/command/command-registry.js';
import type { Shortcut } from '../../src/shortcut/default-shortcuts.js';
import { bindingsOf } from '../../src/shortcut/shortcut-bindings.js';

const UNDO: (() => void)[] = [];

const SHORTCUTS: readonly Shortcut[] = [
    { combination: '$mod+KeyJ', command: 'bindings.probe', scope: 'window' },
    { combination: '$mod+KeyK', command: 'bindings.missing', scope: 'window' },
];

afterEach(() => {
    for (const each of UNDO.splice(0)) {
        each();
    }
});

function press(handler: ((event: KeyboardEvent) => void) | undefined): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { cancelable: true, key: 'j' });

    handler?.(event);

    return event;
}

describe('turning shortcuts into work', () => {
    it('gives every combination a handler', () => {
        expect(Object.keys(bindingsOf(SHORTCUTS))).toEqual(['$mod+KeyJ', '$mod+KeyK']);
    });

    it('runs the command of the combination and takes the key from the page', () => {
        const run = vi.fn();

        UNDO.push(
            registerCommand({
                category: 'commands:categoryTab',
                icon: 'doc',
                id: 'bindings.probe',
                run,
                title: 'commands:closeTab',
            }),
        );

        const handler = bindingsOf(SHORTCUTS)['$mod+KeyJ'] as (event: KeyboardEvent) => void;

        expect(press(handler).defaultPrevented).toBe(true);
        expect(run).toHaveBeenCalledOnce();
    });

    it('lets the key through when the command is not registered', () => {
        const handler = bindingsOf(SHORTCUTS)['$mod+KeyK'] as (event: KeyboardEvent) => void;

        expect(press(handler).defaultPrevented).toBe(false);
    });

    it('lets the key through when the condition of the command does not hold', () => {
        const run = vi.fn();

        UNDO.push(
            registerCommand({
                category: 'commands:categoryTab',
                icon: 'doc',
                id: 'bindings.probe',
                run,
                title: 'commands:closeTab',
                when: () => false,
            }),
        );

        const handler = bindingsOf(SHORTCUTS)['$mod+KeyJ'] as (event: KeyboardEvent) => void;

        expect(press(handler).defaultPrevented).toBe(false);
        expect(run).not.toHaveBeenCalled();
    });
});
