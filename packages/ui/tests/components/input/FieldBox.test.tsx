import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../../../src/components/button/Button.js';
import { EditableLine } from '../../../src/components/input/EditableLine.js';
import { FieldBox } from '../../../src/components/input/FieldBox.js';
import { byPart } from '../../../src/testing/by-part.js';

describe('the box a one-line field lives in', () => {
    /** The padding is part of the field: a click anywhere in the box has to reach the line. */
    it('hands a click on its padding to the line it holds', () => {
        render(
            <FieldBox disabled={false} invalid={false} variant="text">
                <EditableLine
                    disabled={false}
                    invalid={false}
                    label="URL"
                    onValueChange={vi.fn()}
                    value="wss://local"
                />
            </FieldBox>,
        );

        fireEvent.click(byPart('input'));

        expect(screen.getByRole('textbox', { name: 'URL' })).toHaveFocus();
    });

    it('leaves a click on a button inside to that button', () => {
        const onClick = vi.fn();

        render(
            <FieldBox disabled={false} invalid={false} variant="text">
                <EditableLine
                    disabled={false}
                    invalid={false}
                    label="URL"
                    onValueChange={vi.fn()}
                    value="wss://local"
                />
                <Button onClick={onClick}>Limpiar</Button>
            </FieldBox>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

        expect(onClick).toHaveBeenCalledOnce();
        expect(screen.getByRole('textbox', { name: 'URL' })).not.toHaveFocus();
    });

    it('ignores the click of a disabled field, like the line inside it', () => {
        render(
            <FieldBox disabled invalid={false} variant="text">
                <EditableLine
                    disabled
                    invalid={false}
                    label="URL"
                    onValueChange={vi.fn()}
                    value="wss://local"
                />
            </FieldBox>,
        );

        const box = byPart('input');

        fireEvent.click(box);

        expect(screen.getByRole('textbox', { name: 'URL' })).not.toHaveFocus();
        expect(box.className).toContain('cursor-not-allowed');
    });

    it('wears the error frame only when the field says it is invalid', () => {
        render(
            <>
                <FieldBox disabled={false} invalid variant="text">
                    <EditableLine
                        disabled={false}
                        invalid
                        label="URL"
                        onValueChange={vi.fn()}
                        value=""
                    />
                </FieldBox>
                <FieldBox disabled={false} invalid={false} variant="flat">
                    <EditableLine
                        disabled={false}
                        invalid={false}
                        label="Nombre"
                        onValueChange={vi.fn()}
                        value=""
                    />
                </FieldBox>
            </>,
        );

        const boxes = document.querySelectorAll('[data-part="input"]');

        expect(boxes[0]?.className).toContain('border-border-error');
        expect(boxes[1]?.className).toContain('border-transparent');
        expect(boxes[1]?.className).not.toContain('border-border-error');
    });

    it('draws no edge and takes no focus frame of its own when bare: its frame does', () => {
        render(
            <FieldBox disabled={false} invalid={false} variant="bare">
                <EditableLine
                    disabled={false}
                    invalid={false}
                    label="URL"
                    onValueChange={vi.fn()}
                    value=""
                />
            </FieldBox>,
        );

        expect(byPart('input')).not.toHaveAttribute('data-focus-frame');
        expect(byPart('input').className).toContain('border-0');
    });
});
