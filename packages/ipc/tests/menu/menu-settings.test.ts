import { describe, expect, it } from 'vitest';

import { menuSettingsPushSchema } from '../../src/menu/menu-settings.js';

describe('menu:settings payload', () => {
    it('is the click and nothing else', () => {
        expect(menuSettingsPushSchema.safeParse({}).success).toBe(true);
    });

    it('rejects a payload that carries anything', () => {
        expect(menuSettingsPushSchema.safeParse({ section: 'proxy' }).success).toBe(false);
    });
});
