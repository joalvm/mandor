import { describe, expect, it } from 'vitest';

import {
    awaitCallback,
    type Callback,
    type CallbackOptions,
} from '../../../src/auth/oauth/loopback-callback.js';

const STATE = 'xyz';

async function get(url: string): Promise<Response> {
    return fetch(url);
}

function waitFor(options: Partial<CallbackOptions> = {}): Promise<Callback> {
    return awaitCallback({ port: 0, timeoutMs: 5000, state: STATE, ...options });
}

describe('awaitCallback', () => {
    it('listens on loopback and hands over the parameters of the first good call', async () => {
        const callback = await waitFor();
        const answer = await get(`${callback.redirectUri}?code=abc&state=${STATE}`);

        expect(callback.redirectUri).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/callback$/);
        expect(answer.status).toBe(200);
        expect(answer.headers.get('content-type')).toContain('text/plain');
        expect(await answer.text()).toContain('Mandor');
        expect(Object.fromEntries(await callback.parameters)).toEqual({
            code: 'abc',
            state: STATE,
        });
    });

    it('thanks the person in the first language the browser asks for that the app speaks', async () => {
        const callback = await waitFor();
        const answer = await fetch(`${callback.redirectUri}?code=abc&state=${STATE}`, {
            headers: { 'accept-language': 'fr-FR, es-PE;q=0.9, en;q=0.8' },
        });

        expect(await answer.text()).toBe(
            'Mandor recibió la autorización. Ya puedes cerrar esta pestaña.',
        );
        await callback.parameters;
    });

    it('thanks the person in English when the browser asks for no language the app speaks', async () => {
        const callback = await waitFor();
        const answer = await fetch(`${callback.redirectUri}?code=abc&state=${STATE}`, {
            headers: { 'accept-language': 'fr' },
        });

        expect(await answer.text()).toBe(
            'Mandor received the authorization. You can close this tab.',
        );
        await callback.parameters;
    });

    it('closes after the first call: nobody else can answer', async () => {
        const callback = await waitFor();

        await get(`${callback.redirectUri}?code=abc&state=${STATE}`);
        await callback.parameters;

        await expect(get(`${callback.redirectUri}?code=other&state=${STATE}`)).rejects.toThrow();
    });

    it('answers 404 to any other path and keeps waiting', async () => {
        const callback = await waitFor();
        const origin = new URL(callback.redirectUri).origin;

        expect((await get(`${origin}/favicon.ico`)).status).toBe(404);

        await get(`${callback.redirectUri}?code=abc&state=${STATE}`);

        expect((await callback.parameters).get('code')).toBe('abc');
    });

    /** Any page the person visits meanwhile can call loopback: only the provider knows the state. */
    it('answers 400 to a call without the state it asked for and keeps waiting', async () => {
        const callback = await waitFor();

        expect((await get(`${callback.redirectUri}?error=access_denied`)).status).toBe(400);
        expect((await get(`${callback.redirectUri}?code=evil&state=other`)).status).toBe(400);

        await get(`${callback.redirectUri}?code=abc&state=${STATE}`);

        expect((await callback.parameters).get('code')).toBe('abc');
    });

    it('cancels when nobody comes back in time', async () => {
        const callback = await waitFor({ timeoutMs: 20 });

        await expect(callback.parameters).rejects.toMatchObject({ code: 'auth-cancelled' });
    });

    it('cancels and closes when the caller aborts', async () => {
        const controller = new AbortController();
        const callback = await waitFor({ signal: controller.signal });

        controller.abort();

        await expect(callback.parameters).rejects.toMatchObject({ code: 'auth-cancelled' });
        await expect(get(`${callback.redirectUri}?code=late&state=${STATE}`)).rejects.toThrow();
    });

    it('cancels at once when the caller had already aborted', async () => {
        const controller = new AbortController();

        controller.abort();

        const callback = await waitFor({ signal: controller.signal });

        await expect(callback.parameters).rejects.toMatchObject({ code: 'auth-cancelled' });
    });

    it('fails as a token that did not come when the port is taken', async () => {
        const first = await waitFor();
        const port = Number(new URL(first.redirectUri).port);

        await expect(waitFor({ port })).rejects.toMatchObject({
            code: 'auth-token-failed',
        });

        await get(`${first.redirectUri}?code=done&state=${STATE}`);
        await first.parameters;
    });

    it('does not take a call without a code or an error as the answer', async () => {
        const callback = await waitFor();

        expect((await get(`${callback.redirectUri}?state=${STATE}`)).status).toBe(400);

        await get(`${callback.redirectUri}?error=access_denied&state=${STATE}`);

        expect((await callback.parameters).get('error')).toBe('access_denied');
    });
});
