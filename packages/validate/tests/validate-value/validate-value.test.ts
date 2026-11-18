import { describe, expect, it } from 'vitest';

import { validateValue } from '../../src/validate-value/validate-value.js';
import { issuesOf } from '../support/issues-of.js';

const USER_SCHEMA =
    '{"type": "object", "required": ["user"], "properties": {"user": {"type": "object", ' +
    '"required": ["name"], "properties": {"name": {"type": "string"}, "age": {"type": "integer", "minimum": 0}}}}}';

describe('validateValue', () => {
    it('answers with no issues for a value that meets the schema', () => {
        expect(issuesOf(USER_SCHEMA, { user: { name: 'Ada', age: 36 } })).toEqual([]);
    });

    it('reports every offending field instead of only the first one', () => {
        const paths = issuesOf(USER_SCHEMA, { user: { name: 5, age: -1 } }).map(
            (issue) => issue.path,
        );

        expect(paths).toContain('/user/name');
        expect(paths).toContain('/user/age');
    });

    it('names the rule, what it asked and what it got, and where the rule sits', () => {
        expect(issuesOf(USER_SCHEMA, { user: { name: 5 } })).toEqual([
            {
                path: '/user/name',
                keyword: 'type',
                params: { expected: 'string', received: 'integer' },
                schemaPath: '/properties/user/properties/name/type',
                message: 'must be string',
            },
        ]);
    });

    it('points a missing key at its own entry of required', () => {
        expect(issuesOf({ required: ['id', 'name'] }, { id: 1 })).toEqual([
            {
                path: '',
                keyword: 'required',
                params: { property: 'name' },
                schemaPath: '/required/1',
                message: "must have required property 'name'",
            },
        ]);
    });

    it('says a list of types as alternatives', () => {
        expect(issuesOf({ type: ['string', 'null'] }, 1.5)).toEqual([
            expect.objectContaining({
                params: { expected: 'string, null', received: 'number' },
                message: 'must be string or null',
            }),
        ]);
    });

    it('checks nothing with a box this package did not make', () => {
        expect(validateValue({ source: '{}' }, 1)).toEqual([]);
    });

    it('says once what draft 4 reads twice', () => {
        const schema = {
            $schema: 'http://json-schema.org/draft-04/schema#',
            minimum: 3,
            exclusiveMinimum: true,
        };

        expect(issuesOf(schema, 3)).toHaveLength(1);
    });

    it.each([
        ['date-time', 'ayer'],
        ['date', '2020-13-40'],
        ['email', 'no-es-correo'],
        ['uri', 'sin esquema'],
        ['uuid', '123'],
        ['ipv4', '999.1.1.1'],
        ['hostname', '-x-'],
    ])('asserts the format %s', (format, value) => {
        expect(issuesOf({ type: 'string', format }, value)).toEqual([
            expect.objectContaining({
                keyword: 'format',
                params: { format, actual: value },
                schemaPath: '/format',
                message: `must match format "${format}"`,
            }),
        ]);
    });

    it('accepts a value its format describes', () => {
        expect(issuesOf({ format: 'date-time' }, '2026-10-23T10:00:00Z')).toEqual([]);
    });
});
