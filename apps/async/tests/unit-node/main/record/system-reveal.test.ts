import { beforeEach, describe, expect, it, vi } from 'vitest';

const { showItemInFolder } = vi.hoisted(() => ({ showItemInFolder: vi.fn() }));

vi.mock('electron', () => ({ shell: { showItemInFolder } }));

import { systemReveal } from '../../../../src/main/record/system-reveal.js';

describe('the port that shows a written file where it lives', () => {
    beforeEach(() => {
        showItemInFolder.mockClear();
    });

    it('hands the path to the operating system and answers nothing', () => {
        const reveal = systemReveal();

        reveal('/tmp/echo.jsonl');

        expect(showItemInFolder).toHaveBeenCalledWith('/tmp/echo.jsonl');
    });
});
