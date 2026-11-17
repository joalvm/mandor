import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
    AddressActions,
    AddressBar,
    Button,
    IconButton,
    Input,
    TooltipProvider,
} from '../../../src/index.js';

describe('the fused address bar (AddressBar)', () => {
    it('owns the one focus frame and draws a seam between two parts', () => {
        render(
            <AddressBar>
                <Button variant="ghost">GET</Button>
                <Input label="URL" onValueChange={vi.fn()} value="" variant="bare" />
            </AddressBar>,
        );

        const bar = document.querySelector('[data-part="address-bar"]');

        expect(bar).toHaveAttribute('data-focus-frame');
        expect(bar?.querySelectorAll('[data-part="address-bar-seam"]')).toHaveLength(1);
        expect(screen.getByRole('textbox', { name: 'URL' })).toBeInTheDocument();
    });

    it('leaves no seam for a part that draws nothing', () => {
        render(
            <AddressBar>
                <Button variant="ghost">GET</Button>
                {null}
                <Input label="URL" onValueChange={vi.fn()} value="" variant="bare" />
            </AddressBar>,
        );

        expect(document.querySelectorAll('[data-part="address-bar-seam"]')).toHaveLength(1);
    });

    it('draws no seam before the AddressActions at its end, which act on the address', () => {
        render(
            <TooltipProvider>
                <AddressBar>
                    <Button variant="ghost">GET</Button>
                    <Input label="URL" onValueChange={vi.fn()} value="" variant="bare" />
                    <AddressActions>
                        <IconButton icon="code" label="Code" />
                    </AddressActions>
                </AddressBar>
            </TooltipProvider>,
        );

        expect(document.querySelectorAll('[data-part="address-bar-seam"]')).toHaveLength(1);
        expect(
            screen.getByRole('button', { name: 'Code' }).closest('[data-part="address-bar"]'),
        ).not.toBeNull();
    });
});
