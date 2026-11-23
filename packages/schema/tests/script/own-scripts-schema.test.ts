import { describe, expect, it } from 'vitest';

import { CONNECTION_SCRIPT_EVENTS, REQUEST_SCRIPT_EVENTS } from '../../src/script/own-scripts.js';
import {
    connectionScriptsSchema,
    requestScriptsSchema,
} from '../../src/script/own-scripts-schema.js';

describe('the own scripts of a request, a folder or a collection', () => {
    it('names the events a request hooks in', () => {
        expect(REQUEST_SCRIPT_EVENTS).toEqual(['onBeforeRequest', 'onResponse']);
    });

    it('reads one script per event, with the text as it came', () => {
        const scripts = {
            onBeforeRequest: { source: "mandor.variables.set('t', Date.now());\n" },
            onResponse: { source: 'mandor.test("ok", () => {});', enabled: false },
        };

        expect(requestScriptsSchema.parse(scripts)).toEqual(scripts);
    });

    it('reads an empty map and a script with no text', () => {
        expect(requestScriptsSchema.parse({})).toEqual({});
        expect(requestScriptsSchema.parse({ onResponse: { source: '' } })).toEqual({
            onResponse: { source: '' },
        });
    });

    it('keeps an event it does not know, so saving does not drop it', () => {
        const scripts = { onFuture: { source: 'x()' }, onResponse: { source: 'y()' } };

        expect(requestScriptsSchema.parse(scripts)).toEqual(scripts);
    });

    it('refuses an entry with no text or with a switch that is not a boolean', () => {
        expect(requestScriptsSchema.safeParse({ onResponse: {} }).success).toBe(false);
        expect(
            requestScriptsSchema.safeParse({ onResponse: { source: 'a', enabled: 'no' } }).success,
        ).toBe(false);
    });

    it('refuses a text that is not a string, with no limit on how long a string is', () => {
        expect(requestScriptsSchema.safeParse({ onResponse: { source: 1 } }).success).toBe(false);
        expect(
            requestScriptsSchema.safeParse({ onResponse: { source: 'a'.repeat(5_000_000) } })
                .success,
        ).toBe(true);
    });
});

describe('the own scripts of a connection', () => {
    it('names the three events of a connection', () => {
        expect(CONNECTION_SCRIPT_EVENTS).toEqual(['onBeforeConnect', 'onConnect', 'onMessage']);
    });

    it('reads one script per event and keeps an event it does not know', () => {
        const scripts = {
            onBeforeConnect: { source: 'a()' },
            onMessage: { source: 'b()', enabled: true },
            onFuture: { source: 'c()' },
        };

        expect(connectionScriptsSchema.parse(scripts)).toEqual(scripts);
    });

    it('does not take an event of a request as its own', () => {
        const parsed = connectionScriptsSchema.parse({ onResponse: { source: 'a()' } });

        expect(parsed.onConnect).toBeUndefined();
    });
});
