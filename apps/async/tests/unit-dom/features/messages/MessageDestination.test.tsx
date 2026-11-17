import { envStore } from '@mandor/env';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MessageDestination } from '../../../../src/renderer/features/messages/components/panel/MessageDestination.js';
import type {
    OutboundPort,
    OutboundTarget,
} from '../../../../src/renderer/outbound/outbound-port.js';
import { registerOutboundPort } from '../../../../src/renderer/outbound/outbound-registry.js';

import { AppProviders } from '../../support/app-providers.js';

let targets: OutboundTarget[] = [];
let heard: (() => void) | null = null;
let offPort: () => void = () => undefined;

function target(id: string, name: string, live: boolean): OutboundTarget {
    return { environmentId: 'staging', id, live, name };
}

const PORT: OutboundPort = {
    send: () => Promise.resolve(),
    subscribe: (listener) => {
        heard = listener;

        return () => {
            heard = null;
        };
    },
    targets: () => targets,
};

function draw(): void {
    render(<MessageDestination />, { wrapper: AppProviders });
}

beforeEach(() => {
    envStore.getState().reset();
    targets = [];
    offPort = registerOutboundPort(PORT);
});

afterEach(() => {
    cleanup();
    offPort();
});

describe('who takes a message before it is sent', () => {
    it('names the only connection that is up', () => {
        targets = [target('alpha', 'Gateway', true), target('beta', 'Billing', false)];
        draw();

        expect(screen.getByText('Through Gateway')).toBeVisible();
    });

    it('names the environment it resolves against, when that one is known', () => {
        envStore.setState({
            environments: [{ id: 'staging', name: 'Staging', variables: [] }],
        });
        targets = [target('alpha', 'Gateway', true)];
        draw();

        expect(screen.getByText('Through Gateway · Staging')).toBeVisible();
    });

    it('says nothing while the press would ask', () => {
        targets = [target('alpha', 'Gateway', true), target('beta', 'Billing', true)];
        draw();

        expect(document.querySelector('[data-part="message-destination"]')).toBeNull();
    });

    it('says nothing while no connection is up', () => {
        targets = [target('alpha', 'Gateway', false)];
        draw();

        expect(document.querySelector('[data-part="message-destination"]')).toBeNull();
    });

    it('follows the connections as they come up and go down', () => {
        targets = [target('alpha', 'Gateway', false)];
        draw();

        expect(screen.queryByText('Through Gateway')).toBeNull();

        targets = [target('alpha', 'Gateway', true)];
        act(() => {
            heard?.();
        });

        expect(screen.getByText('Through Gateway')).toBeVisible();

        targets = [target('alpha', 'Gateway', false)];
        act(() => {
            heard?.();
        });

        expect(screen.queryByText('Through Gateway')).toBeNull();
    });

    it('hears a port that arrives after the panel, as a restored tab sees it', () => {
        offPort();
        targets = [target('alpha', 'Gateway', true)];
        draw();

        expect(screen.queryByText('Through Gateway')).toBeNull();

        act(() => {
            offPort = registerOutboundPort(PORT);
        });

        expect(screen.getByText('Through Gateway')).toBeVisible();
    });
});
