import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiKeyFields } from '../src/components/auth/ApiKeyFields.js';
import { SchemeFields } from '../src/components/auth/AuthSchemeFields.js';
import { BasicFields } from '../src/components/auth/BasicFields.js';
import { PlacementField } from '../src/components/auth/PlacementField.js';

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

afterEach(cleanup);

describe('SchemeFields', () => {
    it('draws nothing for a level that inherits or carries no scheme', () => {
        const { container } = render(
            <SchemeFields
                auth={{ inherit: true }}
                environment={undefined}
                onChange={vi.fn()}
                onVariablesChange={() => undefined}
                placements={['header', 'query']}
            />,
            { wrapper: Wrapper },
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('folds the prefix of a bearer (BearerFields) under advanced until the level pins one', () => {
        render(
            <SchemeFields
                auth={{ type: 'bearer', token: 't' }}
                environment={undefined}
                onChange={vi.fn()}
                onVariablesChange={() => undefined}
                placements={['header', 'query']}
            />,
            { wrapper: Wrapper },
        );

        expect(screen.getByRole('textbox', { name: 'Token' })).toBeVisible();
        expect(screen.queryByRole('textbox', { name: 'Prefix' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Advanced' })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });

    it('shows the prefix a bearer pins, with what it does under it', () => {
        render(
            <SchemeFields
                auth={{ type: 'bearer', token: 't', prefix: 'Token' }}
                environment={undefined}
                onChange={vi.fn()}
                onVariablesChange={() => undefined}
                placements={['header', 'query']}
            />,
            { wrapper: Wrapper },
        );

        expect(screen.getByRole('textbox', { name: 'Prefix' })).toHaveAccessibleDescription(
            'Written before the token. Empty uses Bearer.',
        );
    });

    it('leaves the prefix out of the level when the reader empties it', () => {
        const onChange = vi.fn();

        render(
            <SchemeFields
                auth={{ type: 'bearer', token: 't', prefix: 'T' }}
                environment={undefined}
                onChange={onChange}
                onVariablesChange={() => undefined}
                placements={['header', 'query']}
            />,
            { wrapper: Wrapper },
        );

        const prefix = screen.getByRole('textbox', { name: 'Prefix' });

        prefix.textContent = '';
        fireEvent.input(prefix);

        expect(onChange).toHaveBeenLastCalledWith({ type: 'bearer', token: 't' });
    });
});

describe('BasicFields', () => {
    it('hands the username the reader writes to its owner, keeping the password', () => {
        const onChange = vi.fn();

        render(
            <BasicFields
                auth={{ type: 'basic', username: '', password: '{{pass}}' }}
                environment={undefined}
                onChange={onChange}
                onVariablesChange={() => undefined}
            />,
            { wrapper: Wrapper },
        );

        const username = screen.getByRole('textbox', { name: 'Username' });

        username.textContent = 'ana';
        fireEvent.input(username);

        expect(onChange).toHaveBeenLastCalledWith({
            type: 'basic',
            username: 'ana',
            password: '{{pass}}',
        });
    });
});

describe('ApiKeyFields', () => {
    it('draws the name, the value and where the key goes', () => {
        render(
            <ApiKeyFields
                auth={{ type: 'apikey', name: 'X-Key', value: '{{key}}', in: 'header' }}
                environment={undefined}
                onChange={vi.fn()}
                onVariablesChange={() => undefined}
                placements={['header', 'query']}
            />,
            { wrapper: Wrapper },
        );

        expect(screen.getByRole('textbox', { name: 'Name' })).toHaveTextContent('X-Key');
        expect(screen.getByRole('textbox', { name: 'Value' })).toHaveTextContent('{{key}}');
        expect(screen.getByRole('combobox', { name: 'Add to' })).toBeVisible();
    });
});

describe('PlacementField', () => {
    it('hands the placement the reader chose to its owner', () => {
        const onChange = vi.fn();

        render(
            <PlacementField
                auth={{ type: 'apikey', name: 'X-Key', value: 'k', in: 'header' }}
                onChange={onChange}
                placements={['header', 'cookie']}
            />,
            { wrapper: Wrapper },
        );

        expect(screen.getByRole('combobox', { name: 'Add to' })).toBeVisible();
    });
});
