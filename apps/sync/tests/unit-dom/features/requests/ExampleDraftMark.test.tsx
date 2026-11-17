import { exampleResource } from '@mandor/collections';
import { shellStore, TabProvider } from '@mandor/shell';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ExampleDraftMark } from '../../../../src/renderer/features/requests/components/examples/ExampleDraftMark.js';
import { requestsStore } from '../../../../src/renderer/features/requests/index.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = exampleResource('Local', 'local', 'crear-pedido', 'Creado');
const OTHER = exampleResource('Local', 'local', 'crear-pedido', 'Rechazado');

const EXAMPLE = { body: '{}', contentType: 'application/json', name: 'Creado', status: '200' };

beforeEach(() => {
    requestsStore.getState().reset();
    shellStore.getState().reset();
});

afterEach(() => {
    cleanup();
    requestsStore.getState().reset();
    shellStore.getState().reset();
});

function drawMark(): void {
    render(
        <TabProvider value={{ resource: RESOURCE, tabId: `example-${RESOURCE}` }}>
            <ExampleDraftMark />
        </TabProvider>,
        { wrapper: AppProviders },
    );
}

function mark(): Element | null {
    return document.querySelector('[data-part="example-draft-mark"]');
}

describe('ExampleDraftMark', () => {
    it('draws nothing while the example of its tab is as the file keeps it', () => {
        drawMark();

        expect(mark()).toBeNull();
    });

    it('draws its dot once the example of its tab holds an edit', () => {
        drawMark();

        act(() => {
            requestsStore.getState().setExampleDraft(RESOURCE, { example: EXAMPLE });
        });

        expect(mark()).not.toBeNull();
    });

    it('ignores the edit of another example', () => {
        drawMark();

        act(() => {
            requestsStore.getState().setExampleDraft(OTHER, { example: EXAMPLE });
        });

        expect(mark()).toBeNull();
    });
});
