import { describe, expect, it } from 'vitest';

import { clampEffects, type EffectLimits } from '../../src/contract/clamp-effects.js';
import type { ScriptEffect } from '../../src/contract/script-run.js';

const LIMITS: EffectLimits = {
    variables: 4,
    variableBytes: 10,
    variablesBytes: 20,
    payloadBytes: 30,
    socketSendsPerRun: 2,
};

function set(name: string, value: string): ScriptEffect {
    return { kind: 'var', name, value };
}

describe('clampEffects', () => {
    it('lets through effects that are inside every limit, in the order they came', () => {
        const effects: ScriptEffect[] = [
            set('a', '1'),
            { kind: 'header', name: 'x-a', op: 'set', value: '1' },
            { kind: 'url', value: 'http://x' },
        ];

        expect(clampEffects(effects, LIMITS)).toEqual({ effects, notes: [] });
    });

    it.each(['a{b', 'a}b'])('drops a variable by the name %j and keeps a header by it', (name) => {
        const header: ScriptEffect = { kind: 'header', name, op: 'set', value: '1' };
        const query: ScriptEffect = { kind: 'query', name, op: 'delete' };
        const result = clampEffects([set(name, '1'), header, query], LIMITS);

        expect(result.effects).toEqual([header, query]);
        expect(result.notes).toEqual([
            { level: 'warn', notice: 'effect-name-forbidden', params: { name } },
        ]);
    });

    it.each(['__proto__', 'constructor', 'prototype', ''])(
        'drops an effect by the name %j, keeps the rest, and says it',
        (name) => {
            const keep = set('ok', '1');
            const result = clampEffects(
                [
                    set(name, '1'),
                    { kind: 'header', name, op: 'delete' },
                    { kind: 'query', name, op: 'delete' },
                    keep,
                ],
                LIMITS,
            );

            expect(result.effects).toEqual([keep]);
            expect(result.notes).toHaveLength(3);
            expect(result.notes[0]).toEqual({
                level: 'warn',
                notice: 'effect-name-forbidden',
                params: { name },
            });
        },
    );

    it('drops all of them when there are more variables than the limit', () => {
        const effects = [set('a', '1'), set('b', '1'), set('c', '1'), set('d', '1'), set('e', '1')];
        const result = clampEffects(effects, LIMITS);

        expect(result.effects).toEqual([]);
        expect(result.notes).toEqual([
            {
                level: 'warn',
                notice: 'effects-too-many-variables',
                params: { count: 5, limit: 4 },
            },
        ]);
    });

    it('counts only the variables against the limit of variables', () => {
        const headers = ['a', 'b', 'c', 'd', 'e'].map((name): ScriptEffect => ({
            kind: 'header',
            name,
            op: 'delete',
        }));

        expect(clampEffects([...headers, set('a', '1')], LIMITS).effects).toHaveLength(6);
    });

    it('counts the effects after the ones with a bad name are gone', () => {
        const effects = [set('', '1'), set('a', '1'), set('b', '1'), set('c', '1'), set('d', '1')];

        expect(clampEffects(effects, LIMITS).effects).toHaveLength(4);
    });

    it('drops all of them when a variable is over its limit, counted in bytes', () => {
        const fits = clampEffects([set('a', 'é'.repeat(5))], LIMITS);
        const over = clampEffects([set('b', 'ok'), set('a', `${'é'.repeat(5)}x`)], LIMITS);

        expect(fits.effects).toHaveLength(1);
        expect(over.effects).toEqual([]);
        expect(over.notes[0]).toEqual({
            level: 'warn',
            notice: 'effects-variable-too-large',
            params: { name: 'a', limit: 10 },
        });
    });

    it('drops all of them when the variables together are over the limit', () => {
        const result = clampEffects(
            [set('a', '123456789'), set('b', '123456789'), set('c', '1')],
            LIMITS,
        );

        expect(result.effects).toEqual([]);
        expect(result.notes[0]).toEqual({
            level: 'warn',
            notice: 'effects-variables-too-large',
            params: { limit: 20 },
        });
    });

    it('drops all of them when a written text is over the size of a payload', () => {
        const long = 'x'.repeat(31);
        const effects: ScriptEffect[] = [
            { kind: 'body', type: 'json', value: long },
            { kind: 'url', value: long },
            { kind: 'socket', value: long },
            { kind: 'header', name: 'x-a', op: 'set', value: long },
        ];

        for (const effect of effects) {
            const result = clampEffects([set('a', '1'), effect], LIMITS);

            expect(result.effects).toEqual([]);
            expect(result.notes[0]).toEqual({
                level: 'warn',
                notice: 'effects-text-too-large',
                params: { limit: 30 },
            });
        }
    });

    it('drops all of them when the script sends more to the socket than a run may', () => {
        const send: ScriptEffect = { kind: 'socket', value: 'x' };
        const result = clampEffects([set('a', '1'), send, send, send], LIMITS);

        expect(result.effects).toEqual([]);
        expect(result.notes[0]).toEqual({
            level: 'warn',
            notice: 'effects-too-many-sends',
            params: { count: 3, limit: 2 },
        });
    });

    it('does not count a delete as a text, nor a method as a variable', () => {
        const effects: ScriptEffect[] = [
            { kind: 'header', name: 'x-a', op: 'delete' },
            { kind: 'method', value: 'PUT' },
        ];

        expect(clampEffects(effects, LIMITS).effects).toEqual(effects);
    });
});
