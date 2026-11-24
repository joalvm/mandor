import { expect, type Locator } from '@playwright/test';

/**
 * Rests the pointer on a word of the first line an editor draws. A line draws its text in runs of
 * one colour, so a word coloured like what stands around it has no element of its own: the
 * pointer goes where the word falls, out of the run the line drew and the place of the word in
 * it. The text of the editor is monospaced, so each character takes the same width.
 *
 * The editor draws a line anew as its marks arrive, and a run measured while it is replaced has
 * no box: it is measured again, on the line that took its place.
 *
 * The editor is of this package, and so is the one place that knows how it lays out its text: the
 * runs of both apps come here for it.
 */
export async function hoverWord(lines: Locator, word: string): Promise<void> {
    const run = lines.locator('.view-line > span').first();

    await expect(run).toContainText(word);
    await expect(async () => {
        const text = (await run.textContent()) ?? '';
        const box = await run.boundingBox();

        if (box === null) {
            throw new Error('the line is not on screen');
        }

        const middle = (text.indexOf(word) + word.length / 2) / text.length;

        await run.page().mouse.move(box.x + box.width * middle, box.y + box.height / 2);
    }).toPass();
}
