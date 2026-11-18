import { describe, expect, it } from 'vitest';

import { appAboutResultSchema } from '../../src/index.js';
import { defaultApp } from '../../src/testing/default-app.js';

describe('the app area a test gets when it says nothing about the app', () => {
    it('answers who it is in the shape its own channel accepts', async () => {
        const answer = appAboutResultSchema.safeParse(await defaultApp().about());

        expect(answer.success).toBe(true);
    });
});
