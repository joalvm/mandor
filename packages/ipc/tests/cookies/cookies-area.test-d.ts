import { describe, expectTypeOf, it } from 'vitest';

import type { CookiesArea } from '../../src/index.js';
import type { CookiesClearRequest } from '../../src/cookies/cookies-clear.js';
import type { CookiesDeleteRequest } from '../../src/cookies/cookies-delete.js';
import type { CookiesListRequest } from '../../src/cookies/cookies-list.js';
import type { CookiesSetRequest } from '../../src/cookies/cookies-set.js';

describe('the cookies area of the bridge contract', () => {
    it('lists by the request its channel validates', () => {
        expectTypeOf<CookiesArea['list']>().parameter(0).toEqualTypeOf<CookiesListRequest>();
    });

    it('sets by the request its channel validates', () => {
        expectTypeOf<CookiesArea['set']>().parameter(0).toEqualTypeOf<CookiesSetRequest>();
    });

    it('deletes by the request its channel validates', () => {
        expectTypeOf<CookiesArea['delete']>().parameter(0).toEqualTypeOf<CookiesDeleteRequest>();
    });

    it('clears by the request its channel validates', () => {
        expectTypeOf<CookiesArea['clear']>().parameter(0).toEqualTypeOf<CookiesClearRequest>();
    });
});
