import type { CookieRow } from '@mandor/ipc';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CookieClearDialog } from '../../../../src/renderer/features/cookies/components/dialog/CookieClearDialog.js';
import { CookieJarRow } from '../../../../src/renderer/features/cookies/components/row/CookieJarRow.js';
import { CookieJarTable } from '../../../../src/renderer/features/cookies/components/table/CookieJarTable.js';
import { AppProviders } from '../../support/app-providers.js';

const SID: CookieRow = {
    domain: 'api.example.com',
    path: '/',
    name: 'sid',
    value: 'abc',
    expires: null,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
};
const THEME: CookieRow = { ...SID, name: 'theme', path: '/app', value: 'dark' };

afterEach(cleanup);

describe('the row of a cookie', () => {
    function drawRow(onSave = vi.fn()): ReturnType<typeof vi.fn> {
        render(
            <table>
                <tbody>
                    <CookieJarRow
                        cookie={SID}
                        onCopy={() => undefined}
                        onDelete={() => undefined}
                        onSave={onSave}
                    />
                </tbody>
            </table>,
            { wrapper: AppProviders },
        );

        return onSave;
    }

    it('writes the new value with its cookie on the check', () => {
        const onSave = drawRow();

        fireEvent.click(screen.getByRole('button', { name: 'Edit value' }));
        fireEvent.input(screen.getByRole('textbox', { name: 'Value of sid' }), {
            target: { textContent: 'new' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save value' }));

        expect(onSave).toHaveBeenCalledWith(SID, 'new');
        expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('writes it on Enter too', () => {
        const onSave = drawRow();

        fireEvent.click(screen.getByRole('button', { name: 'Edit value' }));

        const field = screen.getByRole('textbox', { name: 'Value of sid' });

        fireEvent.input(field, { target: { textContent: 'other' } });
        fireEvent.keyDown(field, { key: 'Enter' });

        expect(onSave).toHaveBeenCalledWith(SID, 'other');
    });

    it('puts the old value back, and writes nothing, on the cross', () => {
        const onSave = drawRow();

        fireEvent.click(screen.getByRole('button', { name: 'Edit value' }));
        fireEvent.input(screen.getByRole('textbox', { name: 'Value of sid' }), {
            target: { textContent: 'new' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Discard change' }));

        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByText('abc')).toBeVisible();
    });
});

describe('the question before the jar is emptied', () => {
    it('answers through the two buttons, and asks nothing while closed', () => {
        const onCancel = vi.fn();
        const onConfirm = vi.fn();
        const { rerender } = render(
            <CookieClearDialog onCancel={onCancel} onConfirm={onConfirm} open />,
            { wrapper: AppProviders },
        );

        fireEvent.click(screen.getByRole('button', { name: 'Empty jar' }));
        expect(onConfirm).toHaveBeenCalledTimes(1);

        rerender(<CookieClearDialog onCancel={onCancel} onConfirm={onConfirm} open={false} />);
        expect(screen.queryByRole('alertdialog')).toBeNull();
    });
});

describe('the table of the jar', () => {
    it('names its columns and draws one line for each cookie', () => {
        render(
            <CookieJarTable
                cookies={[SID, THEME]}
                onCopy={() => undefined}
                onDelete={() => undefined}
                onSave={() => undefined}
            />,
            { wrapper: AppProviders },
        );

        expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
            'Name',
            'Domain',
            'Value',
            'Actions',
        ]);
        expect(screen.getAllByRole('row')).toHaveLength(3);
    });
});
