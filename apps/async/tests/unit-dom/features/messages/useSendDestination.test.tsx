import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSendDestination } from '../../../../src/renderer/features/messages/hooks/useSendDestination.js';
import type {
    OutboundPort,
    OutboundTarget,
} from '../../../../src/renderer/outbound/outbound-port.js';
import { registerOutboundPort } from '../../../../src/renderer/outbound/outbound-registry.js';

let targets: OutboundTarget[] = [];
let heard: () => void = () => undefined;
let offPort: () => void = () => undefined;

function target(name: string, live: boolean): OutboundTarget {
    return { environmentId: 'staging', id: name, live, name };
}

const PORT: OutboundPort = {
    send: () => Promise.resolve(),
    subscribe: (listener) => {
        heard = listener;

        return () => {
            heard = () => undefined;
        };
    },
    targets: () => targets,
};

const NOWHERE = { environmentId: null, name: null };

beforeEach(() => {
    targets = [];
    offPort = registerOutboundPort(PORT);
});

afterEach(() => {
    cleanup();
    offPort();
});

describe('where a send goes without asking (useSendDestination)', () => {
    it('names the only connection that is up, and the environment it resolves against', () => {
        targets = [target('Chat', true), target('Feed', false)];

        const { result } = renderHook(() => useSendDestination());

        expect(result.current).toEqual({ environmentId: 'staging', name: 'Chat' });
    });

    it('names nothing when the press would have to ask', () => {
        targets = [target('Chat', true), target('Feed', true)];

        const { result } = renderHook(() => useSendDestination());

        expect(result.current).toEqual(NOWHERE);
    });

    it('follows the connections as they come up and go down', () => {
        const { result } = renderHook(() => useSendDestination());

        expect(result.current).toEqual(NOWHERE);

        act(() => {
            targets = [target('Chat', true)];
            heard();
        });

        expect(result.current.name).toBe('Chat');
    });

    it('names nothing when no port is registered', () => {
        offPort();

        const { result } = renderHook(() => useSendDestination());

        expect(result.current).toEqual(NOWHERE);
    });
});
