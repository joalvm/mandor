import type { ToastRequest } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RequestImportedScripts } from '../../../../src/renderer/features/requests/components/scripts/RequestImportedScripts.js';
import { AppProviders } from '../../support/app-providers.js';

const SCRIPTS = [
    { event: 'onBeforeRequest', dialect: 'postman', source: "pm.variables.set('x', 1);" },
    { event: 'onResponse', dialect: 'postman', source: "pm.test('ok', () => {});" },
] as const;

const PARTS = {
    scripts: { onResponse: { source: 'a();' } },
    importedScripts: [...SCRIPTS],
};

function shown(parts: typeof PARTS | { importedScripts: [] } = PARTS) {
    const onChange = vi.fn();
    const onNotify = vi.fn<(request: ToastRequest) => void>();

    render(
        <AppProviders onNotify={onNotify}>
            <RequestImportedScripts modelKey="local" onChange={onChange} parts={parts} />
        </AppProviders>,
    );

    return { onChange, onNotify };
}

function moveButton(index: number): HTMLElement {
    const button = screen.getAllByRole('button', { name: 'Move to the script editor' })[index];

    if (button === undefined) {
        throw new Error(`no button to move script ${String(index)}`);
    }

    return button;
}

describe('the imported scripts of a request', () => {
    afterEach(() => {
        cleanup();
    });

    it('says they do not run, and gives each one its title and a reader', () => {
        shown();

        expect(screen.getByText(/do not run here: adjust them to Mandor scripts/)).toBeVisible();
        expect(screen.getByRole('heading', { name: 'Before the request' })).toBeVisible();
        expect(screen.getByRole('heading', { name: 'After the response' })).toBeVisible();
        expect(screen.getAllByRole('textbox', { name: 'Script' })).toHaveLength(2);
    });

    it('draws only the notice when there is no script', () => {
        shown({ importedScripts: [] });

        expect(screen.queryByRole('heading')).toBeNull();
    });

    it('moves one script into the editor of its moment, and no other', () => {
        const { onChange } = shown();

        fireEvent.click(moveButton(1));

        expect(onChange).toHaveBeenCalledWith({
            scripts: { onResponse: { source: `a();\n\n${SCRIPTS[1].source}` } },
            importedScripts: [SCRIPTS[0]],
        });
    });

    it('says the moved text waits for approval, and its action puts everything back', () => {
        const { onChange, onNotify } = shown();

        fireEvent.click(moveButton(0));

        const told = onNotify.mock.calls[0]?.[0];

        expect(told).toMatchObject({
            title: 'Moved to the script editor. It does not run until you approve it.',
            tone: 'info',
        });

        told?.action?.onSelect();

        expect(onChange).toHaveBeenLastCalledWith({
            scripts: PARTS.scripts,
            importedScripts: PARTS.importedScripts,
        });
    });
});
