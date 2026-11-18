import { describe, expectTypeOf, it } from 'vitest';

import type {
    FormatDocument,
    FormatFile,
    InteropCodec,
    InteropFile,
    InteropFormat,
    InteropRead,
} from '../../src/format/interop-format.js';
import type { InteropInput } from '../../src/format/interop-input.js';
import type { ImportResource } from '../../src/resource/import-resource.js';
import type { InteropScope } from '../../src/scope/interop-scope.js';
import type { WorkspaceData } from '../../src/workspace/workspace-data.js';

describe('a format the pipeline is handed', () => {
    it('reads files to what the workspace holds and writes the workspace back to documents', () => {
        expectTypeOf<InteropCodec['read']>().toEqualTypeOf<
            (files: readonly InteropFile[], scope: InteropScope) => Promise<InteropRead>
        >();
        expectTypeOf<InteropRead['resources']>().toEqualTypeOf<ImportResource[]>();
        expectTypeOf<InteropCodec['documentsOf']>().toEqualTypeOf<
            (data: WorkspaceData) => FormatFile[]
        >();
        expectTypeOf<FormatFile['document']>().toEqualTypeOf<FormatDocument>();
        expectTypeOf<InteropCodec['textOf']>().parameter(0).toEqualTypeOf<FormatDocument>();
    });

    it('says what it covers, what the person picks and what its files look like', () => {
        expectTypeOf<InteropFormat['scopes']>().toEqualTypeOf<readonly InteropScope[]>();
        expectTypeOf<InteropFormat['input']>().toEqualTypeOf<InteropInput>();
        expectTypeOf<InteropFormat['sniff']>().toEqualTypeOf<
            (files: readonly InteropFile[]) => boolean
        >();
    });
});
