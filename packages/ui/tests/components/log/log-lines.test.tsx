import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LogLines, type LogLine } from '../../../src/components/log/LogLines.js';

afterEach(cleanup);

function draw(lines: readonly LogLine[]) {
    render(<LogLines empty="Nothing here." label="Lines" lines={lines} />);
}

function linesOf(count: number): LogLine[] {
    return Array.from({ length: count }, (_, index) => ({
        key: `log-${String(index)}`,
        tone: 'log',
        text: `line ${String(index)}`,
    }));
}

describe('a log, line by line (LogLines)', () => {
    it('says so when nothing was written', () => {
        draw([]);

        expect(screen.getByText('Nothing here.')).toBeVisible();
        expect(screen.queryByRole('list', { name: 'Lines' })).toBeNull();
    });

    it('draws each line with its tone and the detail under it', () => {
        draw([
            { key: 'a', tone: 'passed', text: 'status is 200', detail: 'Passed' },
            { key: 'b', tone: 'error', text: 'TypeError: x is undefined' },
            { key: 'c', tone: 'heading', text: 'GET pedidos' },
        ]);

        const items = within(screen.getByRole('list', { name: 'Lines' })).getAllByRole('listitem');

        expect(items.map((item) => item.dataset['tone'])).toEqual(['passed', 'error', 'heading']);
        expect(items[0]).toHaveTextContent('status is 200Passed');
    });

    it('writes what was printed as text, never as markup', () => {
        draw([{ key: 'a', tone: 'log', text: '<b>bold</b>' }]);

        expect(screen.getByText('<b>bold</b>')).toBeVisible();
        expect(document.querySelector('[data-part="log-line"] b')).toBeNull();
    });

    it('draws only what fits on screen of a long log', () => {
        draw(linesOf(5000));

        const drawn = within(screen.getByRole('list', { name: 'Lines' })).getAllByRole('listitem');

        expect(drawn.length).toBeGreaterThan(0);
        expect(drawn.length).toBeLessThan(100);
        expect(screen.getByText('line 0')).toBeVisible();
    });
});
