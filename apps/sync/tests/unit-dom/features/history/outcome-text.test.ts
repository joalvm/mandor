import { describe, expect, it } from 'vitest';

import { outcomeText } from '../../../../src/renderer/features/history/lib/outcome-text.js';
import { summaryOf, ID_A } from '../../support/history-fixture.js';

describe('how a send ended, in one word of the row', () => {
    it('is the status of the answer, or the code of the failure', () => {
        expect(outcomeText(summaryOf(ID_A))).toBe('200');
        expect(
            outcomeText(summaryOf(ID_A, { outcome: { code: 'request-timeout', kind: 'failure' } })),
        ).toBe('request-timeout');
    });
});
