import type { ScriptStatus } from '@mandor/ipc';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ScriptTrustBand } from '../../../src/components/scripts/ScriptTrustBand.js';
import { AppProviders } from '../../support/app-providers.js';

/** A right-to-left override and a space of no width: two characters nobody reading sees. */
const HIDDEN = '\u202E\u200B';

function shown(status: ScriptStatus | null, source = 'steal()', onApprove = vi.fn()) {
    render(
        <AppProviders>
            <ScriptTrustBand onApprove={onApprove} source={source} status={status} />
        </AppProviders>,
    );

    return onApprove;
}

describe('the band over a script that will not run', () => {
    it('says the script waits for an approval, and the button approves it', () => {
        const onApprove = shown('unapproved');

        expect(screen.getByText('It does not run until you approve it')).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

        expect(onApprove).toHaveBeenCalledOnce();
    });

    it('counts the characters in the text nobody would see', () => {
        shown('unapproved', `// admin${HIDDEN} only`);

        expect(screen.getByText('2 hidden characters')).toBeVisible();
    });

    it('says nothing of hidden characters when the text has none', () => {
        shown('unapproved');

        expect(screen.getByText('It does not run until you approve it')).toBeVisible();
        expect(screen.queryByText(/hidden/)).toBeNull();
    });

    it('says a text over the limit does not run, with nothing to approve', () => {
        shown('tooLarge');

        expect(screen.getByText('Over the limit: it does not run')).toBeVisible();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('draws nothing for an approved text, an empty one, or before main answers', () => {
        shown('approved');
        shown('unapproved', '  \n');
        shown(null);

        expect(screen.queryByText(/does not run/)).toBeNull();
    });
});
