import { describe, expectTypeOf, it } from 'vitest';

import type { CodegenArea } from '../../src/index.js';
import type { CodegenFromCurlRequest } from '../../src/codegen/codegen-from-curl.js';
import type { CodegenSnippetRequest } from '../../src/codegen/codegen-snippet.js';

describe('the codegen area of the bridge contract', () => {
    it('reads a curl by the request its channel validates', () => {
        expectTypeOf<CodegenArea['fromCurl']>()
            .parameter(0)
            .toEqualTypeOf<CodegenFromCurlRequest>();
    });

    it('writes a snippet by the request its channel validates', () => {
        expectTypeOf<CodegenArea['snippet']>().parameter(0).toEqualTypeOf<CodegenSnippetRequest>();
    });
});
