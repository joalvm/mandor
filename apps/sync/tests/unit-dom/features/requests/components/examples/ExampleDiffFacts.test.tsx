import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ExampleDiffFacts } from '../../../../../../src/renderer/features/requests/components/examples/ExampleDiffFacts.js';
import { AppProviders } from '../../../../support/app-providers.js';

afterEach(cleanup);

describe('the headers and cookies that came otherwise (ExampleDiffFacts)', () => {
    it('draws nothing with nothing to say', () => {
        render(<ExampleDiffFacts facts={[]} />, { wrapper: AppProviders });

        expect(document.querySelector('[data-part="example-diff-facts"]')).toBeNull();
    });

    it('sets what was expected beside what came', () => {
        render(
            <ExampleDiffFacts
                facts={[
                    { expected: 'a', kind: 'header', name: 'x-a', received: 'b' },
                    { expected: '1', kind: 'cookie', name: 'theme', received: undefined },
                ]}
            />,
            { wrapper: AppProviders },
        );

        const rows = screen.getAllByRole('row');

        expect(rows[1]).toHaveTextContent('Header x-aab');
        expect(rows[2]).toHaveTextContent('Cookie theme1—');
    });
});
