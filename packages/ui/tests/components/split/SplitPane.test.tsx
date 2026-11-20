import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SplitHalf } from '../../../src/components/split/SplitHalf.js';
import { SplitPane } from '../../../src/components/split/SplitPane.js';

const runtimeCss = readFileSync(
    join(import.meta.dirname, '../../../src/styles/runtime.css'),
    'utf8',
);

function ruleOf(selector: string): string {
    const index = runtimeCss.indexOf(selector);

    expect(index, `runtime.css declares ${selector}`).toBeGreaterThanOrEqual(0);

    return runtimeCss.slice(index, runtimeCss.indexOf('}', index));
}

describe('the split pane grid', () => {
    /**
     * The overflow the surface audit found was arithmetic, not styling: a percentage track,
     * plus a fixed handle track, plus the remainder, added up to more than the whole pane.
     * The template only adds up to 100% when the handle owns no track at all.
     */
    it('reparts exactly the whole pane: a share for the first half, the rest for the second', () => {
        const rule = ruleOf("[data-part='split-pane'] {");
        const columns = /grid-template-columns: ([^;]+);/.exec(rule)?.[1] ?? '';

        expect(columns).toContain('attr(data-position');
        expect(columns).toContain('minmax(0, 1fr)');
        expect(columns).not.toMatch(/\d+px/);
    });

    it('lays the handle over the boundary instead of giving it a track of its own', () => {
        const rule = ruleOf("[data-part='split-handle'] {");

        expect(rule).toContain('position: absolute');
    });

    it('keeps the same shape when the halves stack, with no fixed track either', () => {
        const rule = ruleOf("[data-part='split-pane'][data-direction='column'] {");

        expect(rule).toMatch(/grid-template-rows: attr\(data-position[^;]*minmax\(0, 1fr\)/);
        expect(rule).not.toMatch(/grid-template-(rows|columns):[^;]*\d+px/);
    });

    /** Stated after the stacked shape, so a closed pane wins over it in either direction. */
    it('gives the whole pane to one track while the second half is closed', () => {
        const rule = ruleOf("[data-part='split-pane'][data-collapsed] {");

        expect(rule).toContain('grid-template-columns: minmax(0, 1fr)');
        expect(rule).toContain('grid-template-rows: minmax(0, 1fr)');
        expect(runtimeCss.indexOf(rule)).toBeGreaterThan(
            runtimeCss.indexOf("[data-part='split-pane'][data-direction='column'] {"),
        );
    });

    it('mounts both halves and the handle inside one pane', () => {
        render(
            <SplitPane value={40} onValueChange={vi.fn()} label="Resize panels">
                <SplitHalf>first half</SplitHalf>
                <SplitHalf>second half</SplitHalf>
            </SplitPane>,
        );

        expect(screen.getByText('first half')).toBeDefined();
        expect(screen.getByText('second half')).toBeDefined();
        expect(screen.getByRole('separator', { name: 'Resize panels' })).toBeDefined();
    });

    /** A second half that is closed leaves no line to drag: there is nothing to share the pane with. */
    it('draws the first half alone and no handle while the second is closed', () => {
        render(
            <SplitPane collapsed value={40} onValueChange={vi.fn()} label="Resize panels">
                <SplitHalf>first half</SplitHalf>
            </SplitPane>,
        );

        expect(screen.getByText('first half')).toBeDefined();
        expect(screen.queryByRole('separator')).toBeNull();
    });

    /**
     * The grid reads the position from the pane, the line from the handle; attr() never reaches
     * the parent, so a handle without the attribute sits on the 50% fallback while the halves
     * move away from under it.
     */
    it('hands the handle the same position the grid track reads', () => {
        render(
            <SplitPane value={40} onValueChange={vi.fn()} label="Resize panels">
                <SplitHalf>first half</SplitHalf>
                <SplitHalf>second half</SplitHalf>
            </SplitPane>,
        );

        expect(screen.getByRole('separator').getAttribute('data-position')).toBe('40%');
    });

    it('hands the handle the clamped position, the one the track really takes', () => {
        render(
            <SplitPane value={90} onValueChange={vi.fn()} label="Resize panels">
                <SplitHalf>first half</SplitHalf>
                <SplitHalf>second half</SplitHalf>
            </SplitPane>,
        );

        expect(screen.getByRole('separator').getAttribute('data-position')).toBe('70%');
    });

    /**
     * Two cards on the frame stand apart by its gutter, and the handle lives in that gutter. A
     * split inside one card has no gutter to give: its halves meet, as they always did.
     */
    it('opens no gap between its halves unless it is told to', () => {
        render(
            <SplitPane value={40} onValueChange={vi.fn()} label="Resize panels">
                <SplitHalf>first half</SplitHalf>
                <SplitHalf>second half</SplitHalf>
            </SplitPane>,
        );

        expect(screen.getByRole('separator').parentElement).toHaveAttribute('data-gap', 'none');
        expect(runtimeCss).not.toContain("[data-gap='none']");
    });

    it('opens the gutter of the frame between two cards and lays the handle in it', () => {
        render(
            <SplitPane gap="gutter" value={40} onValueChange={vi.fn()} label="Resize panels">
                <SplitHalf>first half</SplitHalf>
                <SplitHalf>second half</SplitHalf>
            </SplitPane>,
        );

        expect(screen.getByRole('separator').parentElement).toHaveAttribute('data-gap', 'gutter');
        expect(ruleOf("[data-part='split-pane'][data-gap='gutter'] {")).toContain(
            'gap: var(--mandor-gap-gutter)',
        );
        expect(ruleOf("[data-gap='gutter'] > [data-part='split-handle'] {")).toContain(
            'var(--mandor-gap-gutter) / 2',
        );
    });
});
