import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DiffSection } from '../../../../src/renderer/features/history/components/diff/DiffSection.js';
import { DiffSends } from '../../../../src/renderer/features/history/components/diff/DiffSends.js';
import { FactsDiff } from '../../../../src/renderer/features/history/components/diff/FactsDiff.js';
import { HistoryDiffView } from '../../../../src/renderer/features/history/components/diff/HistoryDiffView.js';
import { AppProviders } from '../../support/app-providers.js';
import { entryOf, failedEntryOf, ID_A, ID_B } from '../../support/history-fixture.js';
import { httpResponseWith, textBody } from '../../support/http-response.js';

afterEach(cleanup);

function answered(id: string, status: number, text: string) {
    return entryOf(id, {
        outcome: { kind: 'response', response: httpResponseWith({ body: textBody(text), status }) },
    });
}

describe('a part of a comparison', () => {
    it('is a region named by its visible heading', () => {
        render(
            <DiffSection title="Summary">
                <p>inside</p>
            </DiffSection>,
            { wrapper: AppProviders },
        );

        const region = screen.getByRole('region', { name: 'Summary' });

        expect(within(region).getByRole('heading', { level: 2, name: 'Summary' })).toBeVisible();
        expect(within(region).getByText('inside')).toBeVisible();
    });
});

describe('the two sends a comparison is about', () => {
    it('says which is the earlier and which the later, with what each asked', () => {
        render(
            <DiffSends
                earlier={entryOf(ID_A, { sentAt: '2026-09-02T10:00:00.000Z' })}
                later={entryOf(ID_B, { sentAt: '2026-09-02T11:00:00.000Z' })}
            />,
            { wrapper: AppProviders },
        );

        expect(screen.getByText('Earlier')).toBeVisible();
        expect(screen.getByText('Later')).toBeVisible();
        expect(screen.getAllByText('http://localhost/orders')).toHaveLength(2);
    });
});

describe('the facts of a comparison', () => {
    it('writes each fact with its unit and marks only the ones that moved', () => {
        render(
            <FactsDiff
                facts={[
                    { after: 404, before: 200, key: 'status', same: false },
                    { after: 3100, before: 3100, key: 'bodyBytes', same: true },
                ]}
            />,
            { wrapper: AppProviders },
        );

        const rows = screen.getAllByRole('row').slice(1);

        expect(rows.map((row) => row.getAttribute('data-change'))).toEqual(['changed', 'same']);
        expect(within(rows[1] ?? document.body).getAllByText('3.1 kB')).toHaveLength(2);
    });
});

describe('two sends compared once both are read', () => {
    it('draws the sends, then the summary, the headers and the body', () => {
        render(<HistoryDiffView entries={[answered(ID_A, 200, 'a'), answered(ID_B, 404, 'b')]} />, {
            wrapper: AppProviders,
        });

        const headings = screen
            .getAllByRole('heading', { level: 2 })
            .map((each) => each.textContent);

        expect(headings).toEqual(['Summary', 'Headers', 'Body']);
    });

    it('says there is nothing to compare when a send got no answer', () => {
        render(<HistoryDiffView entries={[answered(ID_A, 200, 'a'), failedEntryOf(ID_B)]} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByText('Nothing to compare')).toBeVisible();
        expect(screen.queryByRole('region', { name: 'Summary' })).toBeNull();
    });
});
