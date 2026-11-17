import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SendAnnouncement } from '../../../../src/renderer/features/requests/components/response/SendAnnouncement.js';
import { SendResponse } from '../../../../src/renderer/features/requests/components/response/SendResponse.js';
import type { SendEntry } from '../../../../src/renderer/features/requests/responses.slice.js';
import { AppProviders } from '../../support/app-providers.js';
import { httpResponseWith, textBody } from '../../support/http-response.js';

afterEach(cleanup);

const SENDING: SendEntry = { sendId: '6f0c2f8e-7a3b-4c52-9a38-0d3f8b8c3e11', state: 'sending' };

describe('what a send says to a reader who cannot see the half', () => {
    it('says nothing before anything was sent', () => {
        render(<SendAnnouncement entry={{ state: 'idle' }} />, { wrapper: AppProviders });

        expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });

    it('says the send is on its way', () => {
        render(<SendAnnouncement entry={SENDING} />, { wrapper: AppProviders });

        expect(screen.getByRole('status')).toHaveTextContent('Sending…');
    });

    it('says how the answer came back, with its code and its time', () => {
        render(
            <SendAnnouncement
                entry={{
                    response: httpResponseWith({ status: 201, statusText: 'Created' }),
                    state: 'done',
                }}
            />,
            { wrapper: AppProviders },
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            'Response received: 201 Created, 100 ms',
        );
    });

    it('says why the send failed', () => {
        render(<SendAnnouncement entry={{ error: 'request-timeout', state: 'failed' }} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByRole('status')).toHaveTextContent('The server did not answer in time.');
    });

    /** A reader announces a change in a region it already knew, and misses one that appears full. */
    it('stays the same region while the send goes from one state to the next', () => {
        const { rerender } = render(<SendAnnouncement entry={{ state: 'idle' }} />, {
            wrapper: AppProviders,
        });
        const region = screen.getByRole('status');

        rerender(<SendAnnouncement entry={SENDING} />);
        rerender(<SendAnnouncement entry={{ response: httpResponseWith(), state: 'done' }} />);

        expect(screen.getByRole('status')).toBe(region);
        expect(region).toHaveTextContent('Response received: 200 OK, 100 ms');
    });
});

describe('the half of the response, heard once', () => {
    it('has one region that speaks, whatever state the send is in', () => {
        const onClear = (): void => undefined;
        const entries: readonly SendEntry[] = [
            { state: 'idle' },
            SENDING,
            { response: httpResponseWith({ body: textBody('{}') }), state: 'done' },
            { error: 'request-timeout', state: 'failed' },
        ];
        const { rerender } = render(
            <SendResponse entry={entries[0] ?? SENDING} onClear={onClear} resource="r1" />,
            { wrapper: AppProviders },
        );

        for (const entry of entries) {
            rerender(<SendResponse entry={entry} onClear={onClear} resource="r1" />);

            expect(screen.getAllByRole('status')).toHaveLength(1);
        }
    });
});
