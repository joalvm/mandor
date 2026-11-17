import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FormRow, Input, TooltipProvider } from '../../../src/index.js';
import { byPart } from '../../../src/testing/by-part.js';

describe('the FormRow block', () => {
    it('names the control inside with its label and describes it with its help', () => {
        render(
            <FormRow help="Empty picks a free port." label="Redirect port">
                <Input label="Redirect port" onValueChange={() => undefined} value="" />
            </FormRow>,
        );

        const field = screen.getByRole('textbox', { name: 'Redirect port' });

        expect(field).toHaveAccessibleDescription('Empty picks a free port.');
        expect(screen.getByText('Redirect port', { selector: 'label' })).toHaveAttribute(
            'for',
            field.id,
        );
    });

    it('writes no description while it has no help', () => {
        render(
            <FormRow label="Token">
                <Input label="Token" onValueChange={() => undefined} value="" />
            </FormRow>,
        );

        expect(screen.getByRole('textbox', { name: 'Token' })).not.toHaveAttribute(
            'aria-describedby',
        );
    });

    it('puts what the field means behind a mark beside its name, and describes the control with it', () => {
        render(
            <TooltipProvider>
                <FormRow help="Empty uses Bearer." hint="Written before the token." label="Prefix">
                    <Input label="Prefix" onValueChange={() => undefined} value="" />
                </FormRow>
            </TooltipProvider>,
        );

        expect(byPart('form-label')).toContainElement(byPart('form-hint'));
        expect(screen.getByRole('textbox', { name: 'Prefix' })).toHaveAccessibleDescription(
            'Written before the token. Empty uses Bearer.',
        );
    });
});
