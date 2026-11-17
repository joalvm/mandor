import { byPart } from '@mandor/ui/testing';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ScriptMark } from '../../../src/components/scripts/ScriptMark.js';
import { ScriptMarkText } from '../../../src/components/scripts/ScriptMarkText.js';
import { AppProviders } from '../../support/app-providers.js';

describe('a mark of what the scripts changed on the way', () => {
    it('says what changed after a warning glyph, named by the mark it is', () => {
        render(
            <AppProviders>
                <ScriptMark mark="destination">
                    <ScriptMarkText>
                        It opened without secrets
                        <span>Put the host in the environment.</span>
                    </ScriptMarkText>
                </ScriptMark>
            </AppProviders>,
        );

        const mark = byPart('script-mark');

        expect(mark).toHaveAttribute('data-mark', 'destination');
        expect(mark.querySelector('svg')).not.toBeNull();
        expect(byPart('script-mark-text')).toHaveTextContent(
            'It opened without secretsPut the host in the environment.',
        );
    });

    it('carries no name when it is a line of the plain kind', () => {
        render(
            <AppProviders>
                <ScriptMark>
                    <ScriptMarkText>A redirect stopped</ScriptMarkText>
                </ScriptMark>
            </AppProviders>,
        );

        expect(byPart('script-mark')).not.toHaveAttribute('data-mark');
    });
});
