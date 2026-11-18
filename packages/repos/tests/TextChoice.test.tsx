import { diffEditorAt } from '@mandor/ui/testing/diff-editors-in';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TextChoice } from '../src/components/conflict/TextChoice.js';
import { BODY, Wrapper } from './support/conflict-fixtures.js';

describe('a text both copies rewrote (TextChoice)', () => {
    it('reads the incoming text on the left and starts the result from the merge by lines', async () => {
        render(<TextChoice choice={undefined} item={BODY} label="content" onChoose={vi.fn()} />, {
            wrapper: Wrapper,
        });

        const shown = await diffEditorAt(0);

        expect(shown.original()).toBe('one\ntheirs\n');
        expect(shown.modified()).toBe('one\nmine\n');
        expect(shown.readOnly()).toBe(false);
    });

    it('counts nothing as an answer until the person says so', () => {
        const onChoose = vi.fn();

        render(<TextChoice choice={undefined} item={BODY} label="content" onChoose={onChoose} />, {
            wrapper: Wrapper,
        });

        expect(onChoose).not.toHaveBeenCalled();
        expect(screen.queryByText('Picked')).toBeNull();
    });

    it('takes a side whole, or the result as it stands', () => {
        const onChoose = vi.fn();

        render(<TextChoice choice={undefined} item={BODY} label="content" onChoose={onChoose} />, {
            wrapper: Wrapper,
        });
        fireEvent.click(screen.getByRole('button', { name: 'Use the incoming' }));
        fireEvent.click(screen.getByRole('button', { name: 'Use mine' }));
        fireEvent.click(screen.getByRole('button', { name: 'Use this result' }));

        expect(onChoose.mock.calls).toEqual([
            ['body/content', { pick: 'theirs' }],
            ['body/content', { pick: 'ours' }],
            ['body/content', { text: 'one\nmine\n' }],
        ]);
    });

    it('answers with what is typed in the result', async () => {
        const onChoose = vi.fn();

        render(<TextChoice choice={undefined} item={BODY} label="content" onChoose={onChoose} />, {
            wrapper: Wrapper,
        });
        (await diffEditorAt(0)).typeOver('one\nboth\n');

        expect(onChoose).toHaveBeenLastCalledWith('body/content', { text: 'one\nboth\n' });
    });

    it('shows the result of the answer it was given, and says it is picked', async () => {
        render(
            <TextChoice
                choice={{ pick: 'theirs' }}
                item={BODY}
                label="content"
                onChoose={vi.fn()}
            />,
            { wrapper: Wrapper },
        );

        expect((await diffEditorAt(0)).modified()).toBe('one\ntheirs\n');
        expect(screen.getByText('Picked')).toBeInTheDocument();
    });
});
