import { describe, expectTypeOf, it } from 'vitest';

import type { ChooseSavePath } from '../../src/export/choose-save-path.js';

describe('the way an export asks where to write', () => {
    it('takes the suggested name and answers a path, or null when the user chose nothing', () => {
        expectTypeOf<ChooseSavePath>().toEqualTypeOf<
            (suggestedName: string) => Promise<string | null>
        >();
    });
});
