import { describe, expect, it } from 'vitest';

import { emptyResultSchema, cookiesListResultSchema } from '../../src/index.js';
import { defaultCookies } from '../../src/testing/default-cookies.js';
import { createFakeBridge } from '../../src/testing/fake-bridge.js';

const place = { workspaceId: 'demo', environmentId: null };
const named = { ...place, domain: 'a.test', path: '/', name: 'sid' };

describe('the cookies area a test gets when it says nothing about the jar', () => {
    it('lists nothing, in the shape its own channel accepts', async () => {
        const answer = await defaultCookies().list(place);

        expect(cookiesListResultSchema.parse(answer)).toEqual({ ok: true, value: { cookies: [] } });
    });

    it('sets, deletes and clears with nothing to say', async () => {
        const area = defaultCookies();

        const set = await area.set({ ...place, domain: 'a.test', line: 'sid=x' });

        expect(emptyResultSchema.safeParse(set).success).toBe(true);
        expect(emptyResultSchema.safeParse(await area.delete(named)).success).toBe(true);
        expect(emptyResultSchema.safeParse(await area.clear(place)).success).toBe(true);
    });

    it('is the one the fake bridge hands out, and a test may replace one method of it', async () => {
        const bridge = createFakeBridge({
            cookies: {
                list: () =>
                    Promise.resolve({
                        ok: true,
                        value: {
                            cookies: [
                                {
                                    line: 'sid=abc; Path=/',
                                    domain: 'a.test',
                                    path: '/',
                                    name: 'sid',
                                    value: 'abc',
                                    expires: null,
                                    httpOnly: false,
                                    secure: false,
                                    sameSite: null,
                                },
                            ],
                        },
                    }),
            },
        });

        expect(await bridge.cookies.list(place)).toMatchObject({
            ok: true,
            value: { cookies: [{ name: 'sid' }] },
        });
        await expect(bridge.cookies.clear(place)).resolves.toEqual({ ok: true, value: {} });
    });
});
