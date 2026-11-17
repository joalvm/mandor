import { shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ResponsePanel } from '../../../src/renderer/response/ResponsePanel.js';
import { AppProviders } from '../support/app-providers.js';
import { httpResponseWith, textBody } from '../support/http-response.js';

const RESPONSE = httpResponseWith({ body: textBody('x') });

const TESTS = [
    { name: 'status is 200', passed: true },
    { name: 'has an id', passed: false },
];

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
});

function open(name: RegExp): void {
    fireEvent.mouseDown(screen.getByRole('tab', { name }));
    fireEvent.click(screen.getByRole('tab', { name }));
}

describe('the tests of a send, in the panel of its answer', () => {
    it('adds the tests with their count, marked when one broke, and no console', () => {
        render(<ResponsePanel resource="r1" response={RESPONSE} tests={TESTS} />, {
            wrapper: AppProviders,
        });

        const tests = screen.getByRole('tab', { name: /^Tests/u });

        expect(tests).toHaveAttribute('data-count', '2');
        expect(tests).toHaveAttribute('data-broken');
        expect(screen.queryByRole('tab', { name: /^Console/u })).toBeNull();

        open(/^Tests/u);

        expect(screen.getByText('has an id')).toBeVisible();
    });

    it('leaves the tests unmarked when every case passed', () => {
        render(<ResponsePanel resource="r1" response={RESPONSE} tests={TESTS.slice(0, 1)} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByRole('tab', { name: /^Tests/u })).not.toHaveAttribute('data-broken');
    });

    it('falls back to the body for an answer with no tests, as the history draws it', () => {
        render(<ResponsePanel resource="r1" response={RESPONSE} tests={TESTS} />, {
            wrapper: AppProviders,
        });
        open(/^Tests/u);
        cleanup();
        render(<ResponsePanel resource="r1" response={RESPONSE} />, { wrapper: AppProviders });

        expect(screen.queryByRole('tab', { name: /^Tests/u })).toBeNull();
        expect(screen.getByRole('tab', { name: 'Body' })).toHaveAttribute('aria-selected', 'true');
    });
});
