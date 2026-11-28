import { MessagesProvider } from '@mandor/i18n';
import { byPart } from '@mandor/ui/testing';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { TimingRow } from '../../../src/renderer/response/TimingRow.js';

afterEach(cleanup);

function weights(): string[] {
    return Array.from(document.querySelectorAll('[data-part="timing-span"]')).map(
        (span) => span.getAttribute('data-weight') ?? '',
    );
}

describe('one phase of the send on the time of the whole send', () => {
    it('names the phase and says how long it took', () => {
        render(
            <MessagesProvider preferences={{ language: 'en' }}>
                <TimingRow bar="bg-text-info" label="DNS" ms={5.25} startMs={0} totalMs={100} />
            </MessagesProvider>,
        );

        expect(screen.getByText('DNS')).toBeVisible();
        expect(screen.getByText('5.25 ms')).toBeVisible();
    });

    it('says a long phase in seconds', () => {
        render(
            <MessagesProvider preferences={{ language: 'es' }}>
                <TimingRow
                    bar="bg-text-info"
                    label="Download"
                    ms={2500}
                    startMs={0}
                    totalMs={2500}
                />
            </MessagesProvider>,
        );

        expect(screen.getByText('2,5 s')).toBeVisible();
    });

    /** Widths are weights of the room: what came before, the phase, and what is left. */
    it('weighs the room before the phase, the phase and what is left after it', () => {
        render(<TimingRow bar="bg-text-info" label="TLS" ms={20} startMs={15} totalMs={100} />);

        expect(weights()).toEqual(['15', '20', '65']);
    });

    it('leaves no negative room when the phase runs past the total', () => {
        render(<TimingRow bar="bg-text-info" label="TLS" ms={50} startMs={80} totalMs={100} />);

        expect(weights()).toEqual(['80', '50', '0']);
    });

    it('colours only the bar of the phase', () => {
        render(<TimingRow bar="bg-text-info" label="TLS" ms={20} startMs={15} totalMs={100} />);

        const spans = document.querySelectorAll('[data-part="timing-span"]');

        expect(spans[1]).toHaveClass('bg-text-info');
        expect(spans[0]).not.toHaveClass('bg-text-info');
        expect(byPart('timing-track')).toHaveAttribute('aria-hidden', 'true');
    });
});
