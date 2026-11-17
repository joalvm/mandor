import { describe, expect, it } from 'vitest';

import { effectsTheEventAllows } from '../../src/contract/event-effects.js';
import type { ScriptEffect, ScriptRunInput } from '../../src/contract/script-run.js';

type Event = ScriptRunInput['event'];

const EVERY_KIND: ScriptEffect[] = [
    { kind: 'var', name: 'a', value: '1' },
    { kind: 'header', name: 'x-a', op: 'set', value: '1' },
    { kind: 'query', name: 'q', op: 'delete' },
    { kind: 'url', value: 'http://x' },
    { kind: 'method', value: 'PUT' },
    { kind: 'body', type: 'json', value: '{}' },
    { kind: 'socket', value: 'hi' },
];

const KINDS_BY_EVENT: Record<Event, ScriptEffect['kind'][]> = {
    onBeforeRequest: ['var', 'header', 'query', 'url', 'method', 'body'],
    onResponse: ['var'],
    onBeforeConnect: ['var', 'header', 'query', 'url'],
    onConnect: ['var', 'socket'],
    onMessage: ['var', 'socket'],
};

const EVENTS: readonly Event[] = [
    'onBeforeRequest',
    'onResponse',
    'onBeforeConnect',
    'onConnect',
    'onMessage',
];

function kindsOf(effects: readonly ScriptEffect[]): ScriptEffect['kind'][] {
    return effects.map(({ kind }) => kind);
}

describe('effectsTheEventAllows', () => {
    it.each(EVENTS)(
        'keeps in %s only what its API can write, whatever the worker says',
        (event) => {
            const kinds = KINDS_BY_EVENT[event];
            const result = effectsTheEventAllows(EVERY_KIND, event);

            expect(kindsOf(result.effects)).toEqual(kinds);
            expect(result.notes).toHaveLength(EVERY_KIND.length - kinds.length);
        },
    );

    it('says what it dropped and in which event', () => {
        const result = effectsTheEventAllows([{ kind: 'url', value: 'http://x' }], 'onResponse');

        expect(result.notes).toEqual([
            {
                level: 'warn',
                notice: 'effect-not-in-event',
                params: { event: 'onResponse', kind: 'url' },
            },
        ]);
    });

    it('keeps the order of what it lets through', () => {
        const effects: ScriptEffect[] = [
            { kind: 'url', value: 'http://x' },
            { kind: 'var', name: 'b', value: '2' },
            { kind: 'header', name: 'x-a', op: 'delete' },
        ];

        expect(effectsTheEventAllows(effects, 'onBeforeRequest')).toEqual({ effects, notes: [] });
    });
});
