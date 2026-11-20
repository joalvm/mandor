import type { ActivityRecord } from '@mandor/ipc';
import { byPart } from '@mandor/ui/testing';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ActivityEntry } from '../../../src/renderer/activity/activity-entry.js';
import { ActivityTally } from '../../../src/renderer/activity/components/panel/ActivityTally.js';

function entry(id: string, direction: 'in' | 'out', bytes: number): ActivityEntry {
    const record: ActivityRecord = { at: 1, data: 'hola', direction };

    return {
        at: record.at,
        bytes,
        detail: { ...record, environmentId: null },
        id,
        kind: 'connection-message',
    };
}

describe('the tally beside the title of the timeline', () => {
    it('counts the entries and their bytes, in and out, in a lighter ink', () => {
        render(
            <ActivityTally
                entries={[entry('one', 'in', 8), entry('two', 'out', 7), entry('three', 'in', 40)]}
            />,
        );

        const tally = byPart('activity-tally');

        expect(tally).toHaveTextContent(/^3/);
        expect(tally).toHaveTextContent('↓2·48 B');
        expect(tally).toHaveTextContent('↑1·7 B');
        expect(tally).toHaveClass('text-text-tertiary');
    });

    it('says nothing moved while the timeline is empty', () => {
        render(<ActivityTally entries={[]} />);

        expect(byPart('activity-tally')).toHaveTextContent('0↓0·0 B·↑0·0 B');
    });
});
