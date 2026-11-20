import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActivityFoot } from '../../../src/renderer/activity/components/panel/ActivityFoot.js';

function draw(hidden: number) {
    const onShowAll = vi.fn();

    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <ActivityFoot hidden={hidden} onShowAll={onShowAll} />
            </TooltipProvider>
        </MessagesProvider>,
    );

    return { onShowAll };
}

describe('the foot of the timeline', () => {
    /** A list that says nothing about a filter is a list nobody filtered. */
    it('is not there while the filter hides nothing', () => {
        draw(0);

        expect(document.querySelector('[data-part="activity-foot"]')).toBeNull();
    });

    it('says what the filter hides and offers the way back', () => {
        const { onShowAll } = draw(3);

        const foot = byPart('activity-foot');

        expect(foot).toHaveTextContent('El filtro esconde 3');

        fireEvent.click(within(foot).getByRole('button', { name: 'Mostrar todo' }));

        expect(onShowAll).toHaveBeenCalledOnce();
    });
});
