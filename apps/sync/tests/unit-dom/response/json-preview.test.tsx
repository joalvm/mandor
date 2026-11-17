import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { JsonPreview } from '../../../src/renderer/response/JsonPreview.js';
import { AppProviders } from '../support/app-providers.js';

afterEach(cleanup);

function draw(text: string) {
    render(<JsonPreview text={text} />, { wrapper: AppProviders });
}

describe('JsonPreview and JsonValue', () => {
    it('lays the first level out and keeps what it holds closed until opened', () => {
        draw('{"name":"mandor","tags":["a","second"]}');

        expect(screen.getByText('mandor')).toBeVisible();
        expect(screen.getByText('[2]')).toBeVisible();

        const branch = screen.getByRole('treeitem', { name: /tags/ });

        expect(branch).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('second')).toBeNull();

        fireEvent.click(branch);

        expect(branch).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('second')).toBeVisible();
    });

    it('marks null apart from text', () => {
        draw('{"owner":null}');

        expect(screen.getByText('null')).toHaveAttribute('data-part', 'json-value');
        expect(screen.getByText('null')).toHaveClass('bg-surface-control');
    });

    it('shows a document that is one value as that value', () => {
        draw('42');

        expect(screen.getByText('42')).toBeVisible();
    });

    it('says when the text is not JSON', () => {
        draw('{oops');

        expect(screen.getByText(/not valid JSON/)).toBeVisible();
    });

    it('draws only the lines on screen of a level that holds a hundred thousand', () => {
        draw(JSON.stringify(Array.from({ length: 100_000 }, (_value, n) => n)));

        expect(screen.getByRole('treeitem', { name: '0' })).toBeVisible();
        expect(screen.getAllByRole('treeitem').length).toBeLessThan(100);
    });

    it('opens a line from the keyboard, the way every tree of the window does', () => {
        draw('{"tags":["first"]}');

        const branch = screen.getByRole('treeitem', { name: /tags/ });

        fireEvent.keyDown(branch, { key: 'ArrowRight' });

        expect(branch).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('first')).toBeVisible();
    });
});
