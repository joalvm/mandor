import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isBarrel } from '../../eslint-rules/barrel.js';

describe('the barrel predicate', () => {
    it('knows the public surface of a package', () => {
        expect(isBarrel(join('packages', 'ui', 'src', 'index.ts'))).toBe(true);
        expect(isBarrel(join('packages', 'ui', 'src', 'components', 'index.ts'))).toBe(false);
    });

    /**
     * A feature that lives inside an app has the same public surface as one that lives in a
     * package: the app imports the folder, not the files under it. Only the folder that sits
     * directly under `features/` gets one, so a barrel cannot grow inside a feature either.
     */
    it('knows the public surface of a feature inside an app', () => {
        const feature = join('apps', 'async', 'src', 'renderer', 'features', 'connections');

        expect(isBarrel(join(feature, 'index.ts'))).toBe(true);
        expect(isBarrel(join(feature, 'lib', 'index.ts'))).toBe(false);
        expect(isBarrel(join(feature, 'components', 'index.ts'))).toBe(false);
    });

    it('is about the barrel, not about every file that sits beside one', () => {
        expect(isBarrel(join('packages', 'ui', 'src', 'cn.ts'))).toBe(false);
        expect(
            isBarrel(join('apps', 'async', 'src', 'renderer', 'features', 'connections', 'x.ts')),
        ).toBe(false);
    });
});
