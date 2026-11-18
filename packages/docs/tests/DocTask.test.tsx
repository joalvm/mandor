import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DocView } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';

const TASKS = '- [x] Probar\n- [ ] Publicar\n';

/** The box of a task of a doc (DocTask). */
describe('a task of a doc', () => {
    it('shows what the text says', () => {
        render(<DocView onTask={vi.fn()} value={TASKS} />, { wrapper: AppProviders });

        const [done, pending] = screen.getAllByRole('checkbox', { name: 'Task done' });

        expect(done).toBeChecked();
        expect(pending).not.toBeChecked();
    });

    /** The page does not keep the box: it asks for the task to be written, by its number. */
    it('asks for the task with its number to be ticked when its box is pressed', () => {
        const onTask = vi.fn();

        render(<DocView onTask={onTask} value={TASKS} />, { wrapper: AppProviders });
        fireEvent.click(screen.getAllByRole('checkbox', { name: 'Task done' })[1] ?? document.body);

        expect(onTask).toHaveBeenCalledWith(1);
    });

    it('takes no press where nothing around the page writes the doc', () => {
        render(<DocView value={TASKS} />, { wrapper: AppProviders });

        for (const box of screen.getAllByRole('checkbox', { name: 'Task done' })) {
            expect(box).toBeDisabled();
        }
    });
});
