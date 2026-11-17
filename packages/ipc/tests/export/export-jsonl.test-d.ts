import { describe, expectTypeOf, it } from 'vitest';

import type { ExportedFile, JsonlExportArea, Result } from '../../src/index.js';
import type { ExportJsonlRequest } from '../../src/export/export-jsonl.js';

describe('the jsonl area of the bridge contract', () => {
    it('writes the records it is given and answers where the file stayed', () => {
        expectTypeOf<JsonlExportArea['jsonl']>().parameter(0).toEqualTypeOf<ExportJsonlRequest>();
        expectTypeOf<JsonlExportArea['jsonl']>().returns.resolves.toEqualTypeOf<
            Result<ExportedFile>
        >();
    });
});
