import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ScriptTestsTab } from '../../../src/renderer/response/ScriptTestsTab.js';
import { AppProviders } from '../support/app-providers.js';

afterEach(cleanup);

describe('the cases the scripts named (ScriptTestsTab)', () => {
    it('lists each case in the order it ran, with whether it held and why not', () => {
        render(
            <ScriptTestsTab
                tests={[
                    { name: 'status is 200', passed: true },
                    { name: 'has an id', passed: false, message: 'expected undefined' },
                ]}
            />,
            { wrapper: AppProviders },
        );

        const items = within(
            screen.getByRole('list', { name: 'Tests of the scripts' }),
        ).getAllByRole('listitem');

        expect(items.map((item) => item.textContent)).toEqual([
            'status is 200Passed',
            'has an idFailed: expected undefined',
        ]);
        expect(items.map((item) => item.dataset['tone'])).toEqual(['passed', 'failed']);
    });

    it('says no script ran a test', () => {
        render(<ScriptTestsTab tests={[]} />, { wrapper: AppProviders });

        expect(screen.getByText('No script ran a test.')).toBeVisible();
    });
});
