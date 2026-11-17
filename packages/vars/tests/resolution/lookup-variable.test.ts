import { describe, expect, it } from 'vitest';

import { lookupVariable } from '../../src/resolution/lookup-variable.js';
import type { VariableScope } from '../../src/resolution/variable-scope.js';

const scope: VariableScope = [
    {
        name: 'environment',
        values: { host: 'env.example.com', token: 'env-token' },
        secret: ['token'],
    },
    { name: 'globals', values: { host: 'ws.example.com', port: '8080' } },
];

describe('lookupVariable', () => {
    it('answers with the value of the strongest level that declares the name', () => {
        expect(lookupVariable(scope, 'host')).toEqual({
            level: 'environment',
            value: 'env.example.com',
            secret: false,
        });
    });

    it('walks down to the first level that declares the name', () => {
        expect(lookupVariable(scope, 'port')).toEqual({
            level: 'globals',
            value: '8080',
            secret: false,
        });
    });

    it('marks a name the level declared secret', () => {
        expect(lookupVariable(scope, 'token')).toEqual({
            level: 'environment',
            value: 'env-token',
            secret: true,
        });
    });

    it('marks a name of a level with no secret list as not secret', () => {
        expect(lookupVariable(scope, 'port')?.secret).toBe(false);
    });

    it('marks a name of a level with a secret list that does not hold it as not secret', () => {
        expect(lookupVariable(scope, 'host')?.secret).toBe(false);
    });

    it('matches the name exactly, and nothing close to it', () => {
        expect(lookupVariable(scope, 'Host')).toBeUndefined();
        expect(lookupVariable(scope, 'hostname')).toBeUndefined();
    });

    /** A level is a plain record: what every object inherits is no variable of the user. */
    it('takes nothing a level inherits for a variable', () => {
        expect(lookupVariable(scope, 'constructor')).toBeUndefined();
        expect(lookupVariable(scope, 'toString')).toBeUndefined();
        expect(lookupVariable(scope, '__proto__')).toBeUndefined();
    });

    it('answers undefined for a name no level declares', () => {
        expect(lookupVariable(scope, 'apiKey')).toBeUndefined();
    });

    it('answers undefined on a scope with no levels at all', () => {
        expect(lookupVariable([], 'host')).toBeUndefined();
    });

    it('answers undefined on a level that declares no values', () => {
        expect(lookupVariable([{ name: 'script', values: {} }], 'host')).toBeUndefined();
    });
});
