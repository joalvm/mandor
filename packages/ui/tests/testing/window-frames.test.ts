import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
});

function nextFrame(): Promise<number> {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

// The frames of the window outlive a test that faked the clock: jsdom would otherwise start the
// interval that draws them on the fake clock and keep it, and no frame would come again in the
// worker. The window of the test environment is set up for it in `tools/vitest/frames.ts`.
describe('the frames of the window', () => {
    it('still come after a test changed the focused document on a fake clock', async () => {
        const field = document.createElement('input');

        document.body.append(field);
        field.focus();
        // The focus itself asks for a fix on the real clock: once it ran, nothing waits.
        await nextFrame();
        vi.useFakeTimers();
        // A change of the document while something has the focus asks jsdom to fix the focus up.
        field.setAttribute('hidden', '');
        document.body.append(document.createElement('p'));
        vi.useRealTimers();

        await expect(nextFrame()).resolves.toBeTypeOf('number');
    }, 2_000);

    it('still come after a frame was asked for on a fake clock that faked no frames', async () => {
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
        requestAnimationFrame(() => undefined);
        vi.useRealTimers();

        await expect(nextFrame()).resolves.toBeTypeOf('number');
    }, 2_000);
});
