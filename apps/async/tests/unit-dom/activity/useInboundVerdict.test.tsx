import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { registerInboundSchemas } from '../../../src/renderer/activity/inbound-schema.js';
import { useInboundVerdict } from '../../../src/renderer/activity/hooks/useInboundVerdict.js';

const SCHEMA = '{"type": "object", "properties": {"id": {"type": "number"}}}';

function withProvider(schema: string | undefined): () => void {
    return registerInboundSchemas({
        schemaForChannel: vi.fn().mockResolvedValue(schema),
    });
}

describe('the verdict of an inbound frame', () => {
    it('judges an inbound frame against the schema of the channel it answers', async () => {
        const off = withProvider(SCHEMA);

        const entry = {
            id: 'e1',
            detail: { at: 0, direction: 'in' as const, data: '{"event": "pedidos", "id": "uno"}' },
        };
        const { result } = renderHook(() => useInboundVerdict(entry));

        await waitFor(() => {
            expect(result.current).toHaveLength(1);
        });

        expect(result.current[0]?.path).toBe('/id');
        off();
    });

    it('judges nothing for a frame this window sent', async () => {
        const off = withProvider(SCHEMA);

        const entry = {
            id: 'e2',
            detail: { at: 0, direction: 'out' as const, data: '{"id": "uno"}' },
        };
        const { result } = renderHook(() => useInboundVerdict(entry));

        await waitFor(() => {
            expect(result.current).toEqual([]);
        });

        off();
    });

    it('keeps silent when the channel pairs with no schema at all', async () => {
        const off = withProvider(undefined);

        const entry = {
            id: 'e3',
            detail: { at: 0, direction: 'in' as const, data: '{"event": "otros"}' },
        };
        const { result } = renderHook(() => useInboundVerdict(entry));

        await waitFor(() => {
            expect(result.current).toEqual([]);
        });

        off();
    });
});
