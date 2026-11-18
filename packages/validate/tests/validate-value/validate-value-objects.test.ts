import { describe, expect, it } from 'vitest';

import { issuesOf, type Refused } from '../support/issues-of.js';

const DRAFT_7 = 'http://json-schema.org/draft-07/schema#';

const REFUSED: Refused[] = [
    {
        name: 'an undeclared property of a closed object',
        schema: { properties: { id: {} }, additionalProperties: false },
        value: { id: 1, extra: 2 },
        issue: {
            path: '/extra',
            keyword: 'additionalProperties',
            params: { property: 'extra' },
            message: "must NOT have additional property 'extra'",
        },
    },
    {
        name: 'the second of two properties written alike, by its own place',
        schema: { properties: { id: { type: 'number' }, token: { type: 'number' } } },
        value: { id: 1, token: 'a' },
        issue: { path: '/token', keyword: 'type', schemaPath: '/properties/token/type' },
    },
    {
        name: 'a property no pattern names',
        schema: { patternProperties: { '^x': {} }, additionalProperties: false },
        value: { y: 1 },
        issue: { path: '/y', keyword: 'additionalProperties', params: { property: 'y' } },
    },
    {
        name: 'a property no part of the schema evaluated, seen through allOf',
        schema: {
            properties: { a: {} },
            allOf: [{ properties: { b: {} } }],
            unevaluatedProperties: false,
        },
        value: { a: 1, b: 2, c: 3 },
        issue: {
            path: '/c',
            keyword: 'unevaluatedProperties',
            params: { property: 'c' },
            schemaPath: '/unevaluatedProperties',
            message: "must NOT have unevaluated property 'c'",
        },
    },
    {
        name: 'too few properties',
        schema: { minProperties: 2 },
        value: { a: 1 },
        issue: {
            keyword: 'minProperties',
            params: { limit: '2', actual: '1' },
            message: 'must NOT have fewer than 2 properties',
        },
    },
    {
        name: 'too many properties',
        schema: { maxProperties: 0 },
        value: { a: 1 },
        issue: {
            keyword: 'maxProperties',
            params: { limit: '0', actual: '1' },
            message: 'must NOT have more than 0 properties',
        },
    },
    {
        name: 'a property name the names refuse',
        schema: { propertyNames: { pattern: '^a' } },
        value: { b: 1 },
        issue: {
            keyword: 'propertyNames',
            params: { property: 'b' },
            message: "property name 'b' is invalid",
        },
    },
    {
        name: 'a key another key asks for',
        schema: { dependentRequired: { a: ['b'] } },
        value: { a: 1 },
        issue: {
            keyword: 'dependentRequired',
            params: { property: 'b', dependency: 'a' },
            message: "must have property 'b' when 'a' is present",
        },
    },
    {
        name: 'a key another key asks for, as draft 7 wrote it',
        schema: { $schema: DRAFT_7, dependencies: { a: ['b'] } },
        value: { a: 1 },
        issue: {
            keyword: 'dependencies',
            params: { property: 'b', dependency: 'a' },
            message: "must have property 'b' when 'a' is present",
        },
    },
    {
        name: 'a property the schema forbids',
        schema: { properties: { a: false } },
        value: { a: 1 },
        issue: {
            path: '/a',
            keyword: 'false',
            params: {},
            schemaPath: '',
            message: 'must NOT be present',
        },
    },
];

describe('the rules of objects', () => {
    it.each(REFUSED)('refuses $name', ({ schema, value, issue }) => {
        expect(issuesOf(schema, value)).toContainEqual(expect.objectContaining(issue));
    });
});
