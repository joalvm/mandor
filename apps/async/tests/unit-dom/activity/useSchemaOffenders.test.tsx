import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { ActivityEntry } from '../../../src/renderer/activity/activity-entry.js';
import { registerInboundSchemas } from '../../../src/renderer/activity/inbound-schema.js';
import { useSchemaOffenders } from '../../../src/renderer/activity/hooks/useSchemaOffenders.js';
import { messageEntryOf } from '../support/activity-entries.js';

const SCHEMA = '{"type":"object","required":["n"]}';

function inbound(id: string, data: string, event?: string): ActivityEntry {
    return messageEntryOf({ at: 0, data, direction: 'in', event }, id);
}

function outbound(id: string, data: string, schemaUnmet = false): ActivityEntry {
    return {
        at: 0,
        bytes: data.length,
        detail: { at: 0, data, direction: 'out', environmentId: null, schemaUnmet },
        id,
        kind: 'connection-message',
    };
}

describe('the schema offenders of a timeline', () => {
    let offSchemas: (() => void) | null = null;

    afterEach(() => {
        offSchemas?.();
        offSchemas = null;
    });

    it('names the outbound frames that left without meeting their schema, at once', () => {
        const entries = [outbound('marked', '{}', true), outbound('clean', '{}')];

        const { result } = renderHook(() => useSchemaOffenders(entries, true));

        expect([...result.current]).toEqual(['marked']);
    });

    it('names the inbound frames its judge condemned, once the verdict lands', async () => {
        offSchemas = registerInboundSchemas({ schemaForChannel: () => Promise.resolve(SCHEMA) });
        const entries = [
            inbound('bad', '{"x":1}', 'order.created'),
            inbound('good', '{"n":1}', 'order.created'),
        ];

        const { result } = renderHook(() => useSchemaOffenders(entries, true));

        await waitFor(() => {
            expect(result.current.has('bad')).toBe(true);
        });

        expect(result.current.has('good')).toBe(false);
    });

    it('reads the channel an inbound frame answers off the event the transport named', async () => {
        let asked = '';

        offSchemas = registerInboundSchemas({
            schemaForChannel: (channel) => {
                asked = channel;

                return Promise.resolve(SCHEMA);
            },
        });
        const entries = [
            {
                at: 0,
                bytes: 8,
                detail: {
                    at: 0,
                    data: '{"x":1}',
                    direction: 'in',
                    environmentId: null,
                    event: 'order.created',
                },
                id: 'named',
                kind: 'connection-message',
            } satisfies ActivityEntry,
        ];

        const { result } = renderHook(() => useSchemaOffenders(entries, true));

        await waitFor(() => {
            expect(result.current.has('named')).toBe(true);
        });

        expect(asked).toBe('order.created');
    });

    it('keeps a verdict that lands after the timeline moved on', async () => {
        const waiting: ((schema: string) => void)[] = [];

        offSchemas = registerInboundSchemas({
            schemaForChannel: () =>
                new Promise((resolve) => {
                    waiting.push(resolve);
                }),
        });
        const first = [inbound('bad', '{"x":1}', 'order.created')];
        const { rerender, result } = renderHook(
            ({ entries }) => useSchemaOffenders(entries, true),
            { initialProps: { entries: first } },
        );

        rerender({ entries: [...first, outbound('later', '{}')] });

        for (const release of waiting) {
            release(SCHEMA);
        }

        await waitFor(() => {
            expect(result.current.has('bad')).toBe(true);
        });
    });

    it('holds a frame that pairs with no schema rather than condemning it unread', async () => {
        offSchemas = registerInboundSchemas({ schemaForChannel: () => Promise.resolve(undefined) });
        const entries = [inbound('unknown', '{"x":1}')];

        const { result } = renderHook(() => useSchemaOffenders(entries, true));

        await act(() => Promise.resolve(undefined));

        expect(result.current.has('unknown')).toBe(false);
    });

    it('judges nothing while the mark is off, and answers an empty set', () => {
        offSchemas = registerInboundSchemas({ schemaForChannel: () => Promise.resolve(SCHEMA) });
        const entries = [inbound('bad', '{"x":1}'), outbound('marked', '{}', true)];

        const { result } = renderHook(() => useSchemaOffenders(entries, false));

        expect(result.current.size).toBe(0);
    });
});
