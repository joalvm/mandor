import { MessagesProvider } from '@mandor/i18n';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { byPart } from '@mandor/ui/testing';

import { ActivityRow } from '../../../src/renderer/activity/components/row/ActivityRow.js';
import { ConnectionScriptRow } from '../../../src/renderer/activity/components/row/ConnectionScriptRow.js';
import { scriptEntryOf } from '../support/activity-entries.js';

function Wrapper({ children }: { children: ReactNode }) {
    return <MessagesProvider preferences={{ language: 'es' }}>{children}</MessagesProvider>;
}

describe('the row of what the scripts said', () => {
    it('reads the moment and its figures in one quiet line', () => {
        const entry = scriptEntryOf({
            event: 'onConnect',
            logs: [
                { level: 'log', text: 'a' },
                { level: 'info', text: 'b' },
            ],
            tests: [{ name: 'ok', passed: true }],
        });

        render(<ConnectionScriptRow entry={entry} />, { wrapper: Wrapper });

        const row = byPart('activity-script-row');

        expect(row).toHaveAttribute('data-broke', 'false');
        expect(byPart('activity-script-message')).toHaveTextContent(
            'Al conectar · 2 líneas · tests 1/1',
        );
        expect(row.querySelector('time')).toHaveAttribute(
            'dateTime',
            new Date(entry.at).toISOString(),
        );
    });

    it('marks the row of a script that broke, and says it failed', () => {
        const entry = scriptEntryOf({ error: { message: 'boom', errorName: 'Error' } });

        render(<ConnectionScriptRow entry={entry} />, { wrapper: Wrapper });

        expect(byPart('activity-script-row')).toHaveAttribute('data-broke', 'true');
        expect(byPart('activity-script-message')).toHaveTextContent('Antes de conectar · falló');
    });

    it('is the row the timeline draws for a note of the scripts', () => {
        render(<ActivityRow entry={scriptEntryOf()} />, { wrapper: Wrapper });

        expect(byPart('activity-script-row')).toHaveTextContent('Antes de conectar');
    });
});
