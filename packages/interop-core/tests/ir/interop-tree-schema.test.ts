import { describe, expect, it } from 'vitest';

import {
    interopBodyFieldSchema,
    interopEnvironmentSchema,
    interopGroupSchema,
    interopScriptSchema,
    interopVariableSchema,
} from '../../src/ir/interop-tree-schema.js';

const variable = { name: 'host', value: 'a', enabled: true, secret: false };
const script = { event: 'onBeforeRequest', source: 'a()', enabled: true };

describe('the tree parts of an intermediate document', () => {
    it('reads a group with the variables it declares', () => {
        const group = {
            path: ['A'],
            variables: [variable],
            security: null,
            scripts: [],
            extras: {},
        };

        expect(interopGroupSchema.parse(group).variables).toEqual([variable]);
    });

    it('reads a variable, keeping the empty value and the secret mark', () => {
        const read = interopVariableSchema.parse({ ...variable, value: '', secret: true });

        expect(read).toEqual({ name: 'host', value: '', enabled: true, secret: true });
    });

    it('reads an environment with its variables and refuses one with no name', () => {
        const environment = { name: 'Prod', variables: [variable], extras: {} };

        expect(interopEnvironmentSchema.parse(environment).variables).toHaveLength(1);
        expect(interopEnvironmentSchema.safeParse({ ...environment, name: ' ' }).success).toBe(
            false,
        );
    });

    it('reads a script and refuses a moment no request has, or a key it does not know', () => {
        expect(interopScriptSchema.parse(script).event).toBe('onBeforeRequest');
        expect(interopScriptSchema.safeParse({ ...script, event: 'onMessage' }).success).toBe(
            false,
        );
        expect(interopScriptSchema.safeParse({ ...script, dialect: 'postman' }).success).toBe(
            false,
        );
    });

    it('reads a group, with a path of one name or more, and refuses an empty path', () => {
        const group = { path: ['Pedidos', 'Altas'], security: null, scripts: [script], extras: {} };

        expect(interopGroupSchema.parse(group).path).toEqual(['Pedidos', 'Altas']);
        expect(interopGroupSchema.safeParse({ ...group, path: [] }).success).toBe(false);
        expect(interopGroupSchema.safeParse({ ...group, path: ['  '] }).success).toBe(false);
    });

    it('tells a group that inherits its security from one that has none', () => {
        const group = { path: ['A'], scripts: [], extras: {} };

        expect(interopGroupSchema.parse({ ...group, security: [] }).security).toEqual([]);
        expect(interopGroupSchema.parse({ ...group, security: null }).security).toBeNull();
    });

    it('reads a text row and a file row of a body, and refuses another kind', () => {
        const field = { key: 'file', value: './a.png', enabled: false, kind: 'file' };

        expect(interopBodyFieldSchema.parse(field).kind).toBe('file');
        expect(interopBodyFieldSchema.safeParse({ ...field, kind: 'blob' }).success).toBe(false);
    });
});
