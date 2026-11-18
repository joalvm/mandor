import { describe, expect, it } from 'vitest';

import type { Environment } from '@mandor/schema';

import { fieldSegments } from '../src/lib/field-segments.js';
import { windowScope } from '../src/lib/window-scope.js';

const ENVIRONMENT: Environment = {
    id: 'local',
    name: 'local',
    variables: [
        { name: 'baseUrl', value: 'http://localhost:81/', enabled: true, secret: false },
        { name: 'token', value: '', enabled: true, secret: true },
        { name: 'off', value: 'x', enabled: false, secret: false },
    ],
};

describe('the segments a variable field paints', () => {
    it('paints a declared variable as resolved and carries its name', () => {
        expect(fieldSegments('wss://{{baseUrl}}/ws', windowScope(ENVIRONMENT, [], []))).toEqual([
            { text: 'wss://', tone: undefined, name: undefined },
            { text: '{{baseUrl}}', tone: 'resolved', name: 'baseUrl' },
            { text: '/ws', tone: undefined, name: undefined },
        ]);
    });

    it('paints a declared but empty variable as empty', () => {
        expect(fieldSegments('{{token}}', windowScope(ENVIRONMENT, [], []))).toEqual([
            { text: '{{token}}', tone: 'empty', name: 'token' },
        ]);
    });

    it('paints an undeclared variable as missing', () => {
        expect(fieldSegments('{{nobody}}', windowScope(ENVIRONMENT, [], []))).toEqual([
            { text: '{{nobody}}', tone: 'missing', name: 'nobody' },
        ]);
    });

    /** A disabled declaration is no declaration: it answers nothing at send time either. */
    it('paints a disabled variable as missing', () => {
        expect(fieldSegments('{{off}}', windowScope(ENVIRONMENT, [], []))).toEqual([
            { text: '{{off}}', tone: 'missing', name: 'off' },
        ]);
    });

    it('paints the opening still being written as open', () => {
        expect(fieldSegments('wss://{{ba', windowScope(ENVIRONMENT, [], []))).toEqual([
            { text: 'wss://', tone: undefined, name: undefined },
            { text: '{{ba', tone: 'open', name: 'ba' },
        ]);
    });

    it('paints a dynamic reference as resolved', () => {
        expect(fieldSegments('{{$uuid}}', windowScope(ENVIRONMENT, [], []))).toEqual([
            { text: '{{$uuid}}', tone: 'resolved', name: '$uuid' },
        ]);
    });

    it('paints everything plain without an environment', () => {
        expect(fieldSegments('{{baseUrl}}', windowScope(undefined, [], []))).toEqual([
            { text: '{{baseUrl}}', tone: 'missing', name: 'baseUrl' },
        ]);
    });

    it('paints a name only the workspace declares as resolved', () => {
        const workspace = [{ name: 'p', value: '/ws', enabled: true, secret: false }];

        expect(fieldSegments('{{p}}', windowScope(ENVIRONMENT, workspace, []))).toEqual([
            { text: '{{p}}', tone: 'resolved', name: 'p' },
        ]);
    });

    it('paints a blank workspace variable as empty and ignores a switched-off one', () => {
        const workspace = [
            { name: 'blank', value: '', enabled: true, secret: false },
            { name: 'off', value: 'x', enabled: false, secret: false },
        ];

        expect(fieldSegments('{{blank}}{{off}}', windowScope(undefined, workspace, []))).toEqual([
            { text: '{{blank}}', tone: 'empty', name: 'blank' },
            { text: '{{off}}', tone: 'missing', name: 'off' },
        ]);
    });
});
