import type { ConnectionTransport } from '@mandor/schema';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TransportLogo } from '../../../../src/renderer/features/connections/components/transport/TransportLogo.js';

function draw(transport: ConnectionTransport): HTMLElement {
    const { container } = render(<TransportLogo transport={transport} />);

    const mark = container.querySelector<HTMLElement>('[data-part="transport-logo"]');

    if (mark === null) {
        throw new Error('the logo carries no mark of its own');
    }

    return mark;
}

describe('the logo of a transport', () => {
    it('draws the websocket mark in the hue this window gives it', () => {
        const mark = draw('websocket');

        expect(mark.querySelector('[data-part="websocket-logo"]')).not.toBeNull();
        expect(mark).toHaveClass('text-text-iris');
    });

    it('draws the socket.io mark in its own hue, out of the record keyed by the union', () => {
        const mark = draw('socketio');

        expect(mark.querySelector('[data-part="socket-io-logo"]')).not.toBeNull();
        expect(mark).toHaveClass('text-text-pink');
    });

    /** The logo is decoration the transport carries: no reader is asked to stop at it. */
    it('hides itself from the reader', () => {
        const mark = draw('websocket');

        expect(mark).toHaveAttribute('aria-hidden', 'true');
    });
});
