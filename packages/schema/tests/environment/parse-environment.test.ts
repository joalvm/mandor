import { describe, expect, it } from 'vitest';

import { FormatError, parseEnvironment } from '../../src/index.js';

const validEnvironment = {
    id: 'local',
    name: 'Local',
    variables: [
        { name: 'host', value: 'localhost:8080', enabled: true, secret: false },
        { name: 'token', value: '{{token_file}}', enabled: false, secret: false },
    ],
};

describe('parseEnvironment', () => {
    it('accepts a valid environment', () => {
        expect(parseEnvironment(validEnvironment)).toEqual(validEnvironment);
    });

    it('accepts an environment without variables', () => {
        expect(parseEnvironment({ id: 'local', name: 'Local', variables: [] })).toEqual({
            id: 'local',
            name: 'Local',
            variables: [],
        });
    });

    it('requires the variables field even when empty', () => {
        expect(() => {
            parseEnvironment({ id: 'local', name: 'Local' });
        }).toThrow(/variables/);
    });

    it('rejects a variable name with a space', () => {
        expect(() => {
            parseEnvironment({
                ...validEnvironment,
                variables: [{ name: 'token name', value: 'x', enabled: true, secret: false }],
            });
        }).toThrow(/name/);
    });

    it('rejects a variable name with the dynamic prefix', () => {
        expect(() => {
            parseEnvironment({
                ...validEnvironment,
                variables: [{ name: '$uuid', value: 'x', enabled: true, secret: false }],
            });
        }).toThrow(/name/);
    });

    it('reports a wrongly typed field as a format error', () => {
        expect(() => {
            parseEnvironment({
                ...validEnvironment,
                variables: [{ name: 'host', value: 'x', enabled: 'yes', secret: false }],
            });
        }).toThrow(FormatError);
    });

    it('accepts unknown keys but strips them from parsed domain data', () => {
        expect(parseEnvironment({ ...validEnvironment, color: 'cyan' })).toEqual(validEnvironment);
    });

    it('keeps the origin an import wrote, and its absence for one a person wrote', () => {
        const origin = { kind: 'openapi', sourceId: 'abc', fingerprint: 'f1' };

        expect(parseEnvironment({ ...validEnvironment, origin }).origin).toEqual(origin);
        expect(parseEnvironment(validEnvironment).origin).toBeUndefined();
    });
});
