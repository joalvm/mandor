import { MessagesProvider } from '@mandor/i18n';
import type { ActivityRecord } from '@mandor/ipc';
import { TooltipProvider } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ActivityEntry } from '../../../src/renderer/activity/activity-entry.js';
import { ActivityFoot } from '../../../src/renderer/activity/components/panel/ActivityFoot.js';

function entry(id: string, direction: 'in' | 'out', bytes: number): ActivityEntry {
    const record: ActivityRecord = { at: 1, data: 'hola', direction };

    return {
        at: record.at,
        bytes,
        detail: { ...record, environmentId: null },
        id,
        kind: 'connection-message',
    };
}

const ENTRIES = [entry('one', 'in', 8), entry('two', 'out', 7), entry('three', 'in', 40)];

function draw({
    entries = ENTRIES,
    hidden = 0,
}: {
    entries?: ActivityEntry[];
    hidden?: number;
} = {}) {
    const onShowAll = vi.fn();

    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <ActivityFoot entries={entries} hidden={hidden} onShowAll={onShowAll} />
            </TooltipProvider>
        </MessagesProvider>,
    );

    return { onShowAll };
}

describe('the foot of the timeline', () => {
    it('counts the entries and their bytes, in and out, at the foot', () => {
        draw();

        const foot = byPart('activity-foot');

        expect(foot).toHaveTextContent('3');
        expect(foot).toHaveTextContent('↓2·48 B');
        expect(foot).toHaveTextContent('↑1·7 B');
    });

    /** A list that says nothing about a filter is a list nobody filtered. */
    it('stays silent while the filter hides nothing', () => {
        draw();

        expect(byPart('activity-foot')).not.toHaveTextContent('esconde');
        expect(screen.queryByRole('button', { name: 'Mostrar todo' })).toBeNull();
    });

    it('says what the filter hides and offers the way back', () => {
        const { onShowAll } = draw({ hidden: 3 });

        const foot = byPart('activity-foot');

        expect(foot).toHaveTextContent('El filtro esconde 3');

        fireEvent.click(within(foot).getByRole('button', { name: 'Mostrar todo' }));

        expect(onShowAll).toHaveBeenCalledOnce();
    });
});
