import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NoConnectionOpen } from '../../../../src/renderer/features/connections/components/panel/NoConnectionOpen.js';

import { AppProviders } from '../../support/app-providers.js';

describe('a group of Mandor Realtime with no tab in it', () => {
    /** The add is one glyph in the strip; the group is where there is room to say what it does. */
    it('names the two ways a connection gets into the group', () => {
        render(<NoConnectionOpen />, { wrapper: AppProviders });

        expect(screen.getByText('Select or create a connection')).toBeVisible();
        expect(screen.getByText('Every open connection takes a tab of this group.')).toBeVisible();
    });
});
