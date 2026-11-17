import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Textarea } from '../../../src/components/input/Textarea.js';

afterEach(cleanup);

/** A textarea that holds its own value, the way an owner would. */
function Box({
    initial,
    onValueChange,
}: {
    initial: string;
    onValueChange?: (value: string) => void;
}): ReactNode {
    const [value, setValue] = useState(initial);

    return (
        <Textarea
            label="Texto"
            mono
            onValueChange={(next) => {
                setValue(next);
                onValueChange?.(next);
            }}
            rows={4}
            value={value}
        />
    );
}

describe('the multiline field', () => {
    it('writes what it holds and says it once, in the label it carries', () => {
        const onValueChange = vi.fn();

        render(<Box initial="a:1" onValueChange={onValueChange} />);

        const box = screen.getByRole('textbox', { name: 'Texto' });

        expect(box).toBeVisible();
        fireEvent.change(box, { target: { value: 'a:1\nb:2' } });

        expect(onValueChange).toHaveBeenCalledWith('a:1\nb:2');
    });
});
