import { parseConnection, type Connection, type Environment } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { effectiveUrlOf } from '../../../../../src/renderer/features/connections/lib/effective-url.js';

function connectionOf(changes: Record<string, unknown>): Connection {
    return parseConnection({
        environmentId: null,
        headers: [],
        id: 'gateway',
        name: 'Gateway',
        transport: 'websocket',
        url: 'wss://gateway.example/socket',
        ...changes,
    });
}

const NO_ENVIRONMENT = undefined;

describe('effectiveUrlOf', () => {
    it('rides the enabled params after the query the url already carries', () => {
        const url = effectiveUrlOf(
            connectionOf({
                params: [
                    { key: 'room', value: '1', enabled: true },
                    { key: 'draft', value: 'x', enabled: false },
                    { key: 'team', value: 'a', enabled: true },
                ],
                url: 'wss://gateway.example/socket?live=1',
            }),
            NO_ENVIRONMENT,
        );

        expect(url).toBe('wss://gateway.example/socket?live=1&room=1&team=a');
    });

    it('resolves the variables against the environment the connection owns', () => {
        const environment: Environment = {
            id: 'local',
            name: 'Local',
            variables: [
                { enabled: true, name: 'host', secret: false, value: 'gateway.example' },
                { enabled: false, name: 'host', secret: false, value: 'other.example' },
            ],
        };

        const url = effectiveUrlOf(
            connectionOf({
                params: [{ key: 'token', value: '{{missing}}', enabled: true }],
                url: 'wss://{{host}}/socket',
            }),
            environment,
        );

        expect(url).toBe('wss://gateway.example/socket?token=%7B%7Bmissing%7D%7D');
    });

    /** The settings draw this on every change: a loop in the variables must not break them. */
    it('says the url of variables that loop with the name that closes the loop on it', () => {
        const environment: Environment = {
            id: 'local',
            name: 'Local',
            variables: [
                { enabled: true, name: 'host', secret: false, value: '{{edge}}' },
                { enabled: true, name: 'edge', secret: false, value: '{{host}}' },
            ],
        };

        const url = effectiveUrlOf(connectionOf({ url: 'wss://{{host}}/socket' }), environment);

        expect(url).toBe('wss://{{host}}/socket');
    });

    it('says the url as it is when it does not parse, the placeholders on it', () => {
        const url = effectiveUrlOf(
            connectionOf({ url: 'wss://{{host}}/socket?room=1' }),
            NO_ENVIRONMENT,
        );

        expect(url).toBe('wss://{{host}}/socket?room=1');
    });
});
