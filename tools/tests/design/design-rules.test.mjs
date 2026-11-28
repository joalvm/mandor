import { describe, expect, it } from 'vitest';

import { bandGeometryProblems } from '../../design/band-geometry.mjs';
import { focusRingProblems } from '../../design/focus-ring.mjs';
import { inlineValueProblems } from '../../design/inline-values.mjs';
import { writingSideProblems } from '../../design/writing-sides.mjs';

function file(path, text) {
    return { path, text };
}

describe('the focus ring rule', () => {
    /** The reset is the one place that names the property, and only to switch it off. */
    it('allows the reset to switch the native ring off', () => {
        const reset = file('packages/ui/src/styles/base.css', '*:focus { outline: none; }');

        expect(focusRingProblems([reset])).toEqual([]);
    });

    it('reports any other stylesheet that draws focus outside the box', () => {
        const runtime = file('packages/ui/src/styles/runtime.css', '.tab { outline-width: 2px; }');

        expect(focusRingProblems([runtime])).toHaveLength(1);
        expect(focusRingProblems([runtime])[0]).toContain('data-focus-frame');
    });

    it('reads stylesheets alone and leaves the components to the other rule', () => {
        const component = file('packages/ui/src/components/Tab.tsx', 'const outline: string = "";');

        expect(focusRingProblems([component])).toEqual([]);
    });

    /**
     * The ring replaces the border, so it is drawn on the line the border was on. An inset
     * shadow paints a second line inside the first one, and two lines a pixel apart is what
     * the ring used to look like and what it must not look like again.
     */
    it('reports a focus rule that paints the ring inside the box', () => {
        const runtime = file(
            'packages/ui/src/styles/runtime.css',
            '[data-focus-frame]:focus-visible { box-shadow: inset 0 0 0 1px red; }',
        );

        expect(focusRingProblems([runtime])).toHaveLength(1);
        expect(focusRingProblems([runtime])[0]).toContain('inside');
    });

    /**
     * A spread shadow with no offset and no blur is a ring drawn outside the box: it overlaps
     * the neighbour and leaves the four pixel grid, the same fault as an outline.
     */
    it('reports a focus rule that paints the ring outside the box', () => {
        const runtime = file(
            'packages/ui/src/styles/focus.css',
            '[data-part="row"]:focus-visible { box-shadow: 0 0 0 1px var(--focus-ring); }',
        );

        expect(focusRingProblems([runtime])).toHaveLength(1);
        expect(focusRingProblems([runtime])[0]).toContain('outside');
    });

    it('accepts a focus rule that recolours the border it lands on', () => {
        const runtime = file(
            'packages/ui/src/styles/runtime.css',
            '[data-focus-frame]:focus-visible { border-color: var(--focus-ring); }',
        );

        expect(focusRingProblems([runtime])).toEqual([]);
    });

    it('leaves an inset shadow alone when the rule has nothing to do with focus', () => {
        const runtime = file(
            'packages/ui/src/styles/runtime.css',
            '[data-part="well"] { box-shadow: inset 0 1px 2px red; }',
        );

        expect(focusRingProblems([runtime])).toEqual([]);
    });

    it('lets a focus frame be placed with the logical inset of its sides', () => {
        const runtime = file(
            'packages/env/src/styles/key-value.css',
            '[data-row]:focus-within::after { inset-inline: -1px 0; border-color: red; }',
        );

        expect(focusRingProblems([runtime])).toEqual([]);
    });
});

describe('the inline value rule', () => {
    it('accepts a component built out of token utilities', () => {
        const tab = file(
            'packages/ui/src/components/Tab.tsx',
            '<div className="px-pad-control" />',
        );

        expect(inlineValueProblems([tab])).toEqual([]);
    });

    it('reports a measure written inline', () => {
        const tab = file('packages/ui/src/components/Tab.tsx', '<div style={{ height: 30 }} />');

        expect(inlineValueProblems([tab])[0]).toContain('sets `style` inline');
    });

    /** A one-off value is a step of the scale nobody named yet. */
    it('reports an arbitrary Tailwind value', () => {
        const tab = file('packages/ui/src/components/Tab.tsx', '<div className="h-[30px]" />');

        expect(inlineValueProblems([tab])[0]).toContain('arbitrary Tailwind value');
    });

    it('reads components alone and leaves the stylesheets to the other rule', () => {
        const css = file('packages/ui/src/styles/scales.css', '.h-row { height: 30px; }');

        expect(inlineValueProblems([css])).toEqual([]);
    });
});

describe('the band geometry rule', () => {
    it('accepts a band with one named height, its inset and its alignment', () => {
        const bar = file(
            'packages/ui/src/components/Bar.tsx',
            '<div className="flex h-header items-center px-pad-panel" />',
        );

        expect(bandGeometryProblems([bar])).toEqual([]);
    });

    /** The trail, the address and the toolbar of a destination are heights of the scale too. */
    it('accepts the heights of the rows of a destination', () => {
        const rows = ['h-crumb', 'h-address', 'h-toolbar'].map((height) =>
            file(
                'packages/ui/src/components/Bar.tsx',
                `<div className="flex ${height} items-center px-pad-panel" />`,
            ),
        );

        expect(bandGeometryProblems(rows)).toEqual([]);
    });

    /** An inset written to the start or the end of the line is an inset too. */
    it('accepts a band whose inset names the start or the end of the line', () => {
        const rows = ['ps-pad-panel', 'pe-pad-control'].map((inset) =>
            file(
                'packages/ui/src/components/Bar.tsx',
                `<div className="flex h-header items-center ${inset}" />`,
            ),
        );

        expect(bandGeometryProblems(rows)).toEqual([]);
    });

    /** A row that never says so leaves a control of fixed height against the top edge. */
    it('reports a row that never says where its contents sit across it', () => {
        const bar = file(
            'packages/ui/src/components/Bar.tsx',
            '<div className="flex gap-gap-control" />',
        );

        expect(bandGeometryProblems([bar])[0]).toContain('items-center');
    });

    it('reports a band measured in numbers', () => {
        const bar = file(
            'packages/ui/src/components/Bar.tsx',
            '<div className="flex h-13 items-center px-pad-panel" />',
        );

        expect(bandGeometryProblems([bar])[0]).toContain('numbers');
    });

    it('reports a band that opens against the edge of the window', () => {
        const bar = file(
            'packages/ui/src/components/Bar.tsx',
            '<div className="flex h-header items-center" />',
        );

        expect(bandGeometryProblems([bar])[0]).toContain('inset');
    });

    it('reports a band given two heights at once', () => {
        const bar = file(
            'packages/ui/src/components/Bar.tsx',
            '<div className="flex h-header h-control items-center px-pad-panel" />',
        );

        expect(bandGeometryProblems([bar])[0]).toContain('two heights');
    });

    /** What stacks has its own rhythm, and the cross axis of a column is not a band. */
    it('leaves a column alone', () => {
        const stack = file(
            'packages/ui/src/components/Stack.tsx',
            '<div className="flex min-h-0 flex-col" />',
        );

        expect(bandGeometryProblems([stack])).toEqual([]);
    });

    it('reads the classes of one tag out of every string it is built from', () => {
        const bar = file(
            'packages/ui/src/components/Bar.tsx',
            "<div className={cn('flex h-header', open && 'items-center px-pad-panel')} />",
        );

        expect(bandGeometryProblems([bar])).toEqual([]);
    });

    it('takes a written reason above the tag as the answer', () => {
        const bar = file(
            'packages/ui/src/components/Bar.tsx',
            ['// band-policy: a frame of a preview.', '<div className="flex h-64" />'].join('\n'),
        );

        expect(bandGeometryProblems([bar])).toEqual([]);
    });

    it('reads components alone and leaves the stylesheets to the other rules', () => {
        const css = file('packages/ui/src/styles/scales.css', '.flex { display: flex; }');

        expect(bandGeometryProblems([css])).toEqual([]);
    });
});

describe('the sides of the line', () => {
    it('reports a class written to the left or the right of a component', () => {
        const row = file('packages/ui/src/components/Row.tsx', '<div className="flex ml-auto" />');

        expect(writingSideProblems([row])).toHaveLength(1);
        expect(writingSideProblems([row])[0]).toContain('ms-');
    });

    it('takes the classes that name the start and the end, and centring on the middle', () => {
        const row = file(
            'packages/ui/src/components/Row.tsx',
            '<div className="ms-auto pe-pad-panel text-end border-s-2 rounded-e-none before:left-1/2 before:-translate-x-1/2" />',
        );

        expect(writingSideProblems([row])).toEqual([]);
    });

    it('reports a stylesheet that lays something out to a physical side', () => {
        const sheets = [
            file('packages/ui/src/styles/a.css', 'a {\n    right: 0;\n}'),
            file('packages/ui/src/styles/b.css', 'b {\n    border-left: 1px solid;\n}'),
            file('packages/ui/src/styles/c.css', 'c {\n    text-align: left;\n}'),
        ];

        expect(writingSideProblems(sheets)).toHaveLength(3);
    });

    it('leaves a class name of a library that says a side alone', () => {
        const grid = file(
            'packages/shell/src/styles/grid.css',
            '.dv-left-actions-container {\n    inset-inline-start: 0;\n}',
        );

        expect(writingSideProblems([grid])).toEqual([]);
    });
});
