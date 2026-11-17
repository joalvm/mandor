import { describe, expect, it } from 'vitest';

import {
    asyncapiFormat,
    brunoFormat,
    harFormat,
    insomniaFormat,
    openapiFormat,
    postmanFormat,
} from '../src/index.js';

describe('the barrel of interop-formats', () => {
    it('states every format the package writes under the id its callers know it by', () => {
        expect(
            [
                openapiFormat,
                asyncapiFormat,
                postmanFormat,
                insomniaFormat,
                brunoFormat,
                harFormat,
            ].map((format) => format.id),
        ).toEqual(['openapi', 'asyncapi', 'postman', 'insomnia', 'bruno', 'har']);
    });
});
