import { type LogWriteRequest, success } from '@mandor/ipc';
import { windowBridge } from '@mandor/ipc/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { rootErrorOptions, watchRendererFaults } from '../../src/fault/root-error-options.js';

let written: LogWriteRequest[];

beforeEach(() => {
    written = [];
    windowBridge().log.write = (input) => {
        written.push(input);

        return Promise.resolve(success({}));
    };
});

describe('the error doors of a React root', () => {
    it('writes each kind of error under its own source', () => {
        const options = rootErrorOptions();
        const error = new Error('boom');

        options.onUncaughtError(error, { componentStack: '\n    at Tab' });
        options.onCaughtError(error, {});
        options.onRecoverableError(error, {});

        expect(written.map((line) => [line.source, line.level])).toEqual([
            ['react-uncaught', 'error'],
            ['react-caught', 'error'],
            ['react-recoverable', 'warn'],
        ]);
        expect(written[0]?.stack).toContain('at Tab');
    });
});

describe('the faults no boundary sees', () => {
    it('writes an error of the window and a promise nobody caught, and stops when told', () => {
        const target = new EventTarget();
        const stop = watchRendererFaults(target as Window);
        const error = new Error('en un temporizador');

        target.dispatchEvent(Object.assign(new Event('error'), { error, message: 'ignored' }));
        target.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'no' }));
        stop();
        target.dispatchEvent(Object.assign(new Event('error'), { error }));

        expect(written.map((line) => [line.source, line.message])).toEqual([
            ['window-error', 'en un temporizador'],
            ['unhandled-rejection', 'no'],
        ]);
    });

    it('falls back to the text of the event when the error carries no object', () => {
        const target = new EventTarget();

        watchRendererFaults(target as Window);
        target.dispatchEvent(Object.assign(new Event('error'), { message: 'Script error.' }));

        expect(written[0]).toMatchObject({ source: 'window-error', message: 'Script error.' });
    });
});
