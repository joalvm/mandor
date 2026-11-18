import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SchemeFields } from '../src/components/auth/AuthSchemeFields.js';

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

afterEach(cleanup);

describe('BasicFields for a digest', () => {
    it('hands the password the reader writes to its owner, keeping the username', () => {
        const onChange = vi.fn();

        render(
            <SchemeFields
                auth={{ type: 'digest', username: 'ana', password: '' }}
                environment={undefined}
                onChange={onChange}
                onVariablesChange={() => undefined}
                placements={['header', 'query']}
            />,
            { wrapper: Wrapper },
        );

        expect(screen.getByRole('textbox', { name: 'Username' })).toHaveTextContent('ana');

        const password = screen.getByRole('textbox', { name: 'Password' });

        password.textContent = '{{pass}}';
        fireEvent.input(password);

        expect(onChange).toHaveBeenLastCalledWith({
            type: 'digest',
            username: 'ana',
            password: '{{pass}}',
        });
    });
});

describe('AwsV4Fields', () => {
    const keys = { type: 'awsv4', accessKeyId: 'AKID', secretAccessKey: '{{secret}}' } as const;

    it('shows the keys and folds region, service and session token under advanced', () => {
        render(
            <SchemeFields
                auth={keys}
                environment={undefined}
                onChange={vi.fn()}
                onVariablesChange={() => undefined}
                placements={['header', 'query']}
            />,
            { wrapper: Wrapper },
        );

        expect(screen.getByRole('textbox', { name: 'Access key' })).toHaveTextContent('AKID');
        expect(screen.getByRole('textbox', { name: 'Secret key' })).toHaveTextContent('{{secret}}');
        expect(screen.queryByRole('textbox', { name: 'AWS region' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Advanced' })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });

    it('opens advanced when the level pins a region, saying what empty does', () => {
        render(
            <SchemeFields
                auth={{ ...keys, region: 'eu-west-1' }}
                environment={undefined}
                onChange={vi.fn()}
                onVariablesChange={() => undefined}
                placements={['header', 'query']}
            />,
            { wrapper: Wrapper },
        );

        expect(screen.getByRole('textbox', { name: 'AWS region' })).toHaveAccessibleDescription(
            'Empty reads it from the AWS host, or uses us-east-1.',
        );
        expect(screen.getByRole('textbox', { name: 'Service name' })).toBeVisible();
        expect(screen.getByRole('textbox', { name: 'Session token' })).toBeVisible();
    });

    it.each([
        ['AWS region', { region: 'eu-west-1' }],
        ['Service name', { service: 's3' }],
        ['Session token', { sessionToken: '{{token}}' }],
    ])('leaves the %s out of the level when the reader empties it', (name, pinned) => {
        const onChange = vi.fn();

        render(
            <SchemeFields
                auth={{ ...keys, ...pinned }}
                environment={undefined}
                onChange={onChange}
                onVariablesChange={() => undefined}
                placements={['header', 'query']}
            />,
            { wrapper: Wrapper },
        );

        const field = screen.getByRole('textbox', { name });

        field.textContent = '';
        fireEvent.input(field);

        expect(onChange).toHaveBeenLastCalledWith(keys);
    });

    it('hands the keys the reader writes to their owner', () => {
        const onChange = vi.fn();

        render(
            <SchemeFields
                auth={keys}
                environment={undefined}
                onChange={onChange}
                onVariablesChange={() => undefined}
                placements={['header', 'query']}
            />,
            { wrapper: Wrapper },
        );

        const access = screen.getByRole('textbox', { name: 'Access key' });

        access.textContent = '{{key}}';
        fireEvent.input(access);

        expect(onChange).toHaveBeenLastCalledWith({ ...keys, accessKeyId: '{{key}}' });

        const secret = screen.getByRole('textbox', { name: 'Secret key' });

        secret.textContent = '{{other}}';
        fireEvent.input(secret);

        expect(onChange).toHaveBeenLastCalledWith({ ...keys, secretAccessKey: '{{other}}' });
    });
});
