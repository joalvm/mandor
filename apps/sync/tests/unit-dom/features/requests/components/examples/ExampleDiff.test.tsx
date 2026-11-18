import { TabProvider } from '@mandor/shell';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ExampleDiff } from '../../../../../../src/renderer/features/requests/components/examples/ExampleDiff.js';
import { compareExample } from '../../../../../../src/renderer/features/requests/lib/compare/compare-example.js';
import { AppProviders } from '../../../../support/app-providers.js';
import { httpResponseWith, textBody } from '../../../../support/http-response.js';

afterEach(cleanup);

const EXAMPLE = {
    body: '{"id":1}',
    contentType: 'application/json',
    name: 'Creado',
    status: '200',
};

function draw(props: Omit<Parameters<typeof ExampleDiff>[0], 'example'>): void {
    render(
        <TabProvider value={{ resource: 'mandor://ejemplo', tabId: 'mandor://ejemplo' }}>
            <ExampleDiff example={EXAMPLE} {...props} />
        </TabProvider>,
        { wrapper: AppProviders },
    );
}

describe('the Differences tab (ExampleDiff)', () => {
    it('invites to send before one was', () => {
        draw({ comparison: undefined, entry: { state: 'idle' } });

        expect(screen.getByRole('heading', { name: 'Not checked yet' })).toBeVisible();
    });

    it('invites to send while the first one is on its way', () => {
        draw({ comparison: undefined, entry: { sendId: 's1', state: 'sending' } });

        expect(screen.getByRole('heading', { name: 'Not checked yet' })).toBeVisible();
    });

    it('says what failed as the request says it', () => {
        draw({ comparison: undefined, entry: { error: 'request-failed', state: 'failed' } });

        expect(
            document.querySelector('[data-part="response-summary"][data-state="failed"]'),
        ).not.toBeNull();
        expect(screen.queryByRole('heading', { name: 'Not checked yet' })).toBeNull();
    });

    it('goes back to the empty state when nothing differs, and asks to send again', () => {
        const response = httpResponseWith({ body: textBody('{"id":1}') });

        draw({
            comparison: compareExample({ ...EXAMPLE, status: '200' }, response),
            entry: { response, state: 'done' },
        });

        expect(screen.getByRole('heading', { name: 'No differences' })).toBeVisible();
        expect(screen.getByText('Send again to look for new changes.')).toBeVisible();
        expect(document.querySelector('[data-part="example-diff-editor"]')).toBeNull();
        expect(document.querySelector('[data-part="example-diff-bar"]')).toBeNull();
    });

    it('draws the band and the editor once the answer came', () => {
        const response = httpResponseWith({ body: textBody('{"id":2}') });

        draw({
            comparison: compareExample(EXAMPLE, response),
            entry: { response, state: 'done' },
        });

        expect(screen.getByText('Received')).toBeVisible();
        expect(document.querySelector('[data-part="example-diff-editor"]')).not.toBeNull();
    });
});
