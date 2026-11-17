import { expect, type Page, type Locator } from '@playwright/test';

/**
 * What the window is showing, group by group: the tabs of each one in the order they sit in,
 * with a star on the one in front. It is the whole of what the session is asked to bring
 * back — the shape of the tree, where each tab ended up, and which one each group shows.
 */
export async function windowShape(page: Page): Promise<string[][]> {
    await expect(page.locator('.dv-groupview').first()).toBeVisible();

    return page.evaluate(() =>
        [...document.querySelectorAll('.dv-groupview')].map((group) => {
            // The strip of the group, and not every tab under it: what a panel draws inside
            // itself — the sections of a composer, say — belongs to what the panel is holding
            // and comes and goes with it.
            const strip = group.querySelector('.dv-tabs-container');

            return [...(strip?.querySelectorAll('[role="tab"]') ?? [])].map((tab) => {
                const shown = tab.getAttribute('aria-selected') === 'true';

                return `${tab.textContent}${shown ? '*' : ''}`;
            });
        }),
    );
}

/** Where the pointer has to let go for the drop to land on the far end of a strip. */
async function farEnd(target: Locator): Promise<{ x: number; y: number }> {
    const box = await target.boundingBox();

    if (box === null) {
        throw new Error('the group is not showing anything to drop a tab onto');
    }

    return { x: box.width - 12, y: box.height / 2 };
}

/** Drops the tab on the right edge of its own group, which splits the group in two. */
export async function dragToRightEdge(page: Page, name: string): Promise<void> {
    const target = page.locator('.dv-content-container').first();

    await page.getByRole('tab', { name }).dragTo(target, { targetPosition: await farEnd(target) });
    await expect(page.locator('.dv-groupview')).toHaveCount(2);
}

/**
 * Hands the tab over to another group, dropped on the empty stretch of its tab row. That is
 * where a group takes a tab in: the body belongs to whatever is drawn inside it, and an editor
 * there answers a drop with text of its own. The stretch is its own box because the row also
 * ends in controls — the environment picker among them — and those answer a drop with nothing.
 */
export async function dragToGroup(page: Page, name: string, index: number): Promise<void> {
    const group = page.locator('.dv-groupview').nth(index);

    // The drag is fed the way a finger drags: a pointer of touch goes down on the tab,
    // crosses in steps, and comes up over the stretch that takes the tab in. With a mouse
    // the strip hands the gesture to the native drag of the browser, and that handover is
    // exactly what a runner's synthesized pointer cannot do; the touch pointer takes the
    // same road every platform has.
    await page.evaluate(
        ({ name, index }) => {
            const tab = [...document.querySelectorAll('[role="tab"]')].find((element) =>
                element.textContent.includes(name),
            );
            const group = document.querySelectorAll('.dv-groupview')[index];

            if (group === undefined) {
                throw new Error(`the group ${String(index)} was not on screen`);
            }

            const target = group.querySelector('.dv-void-container');

            if (tab === undefined || target === null) {
                throw new Error(`the tab ${name} was not on screen`);
            }

            const from = tab.getBoundingClientRect();
            const to = target.getBoundingClientRect();
            const pointer = (x: number, y: number): PointerEventInit => ({
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y,
                isPrimary: true,
                buttons: 1,
                pointerId: 7,
                pointerType: 'touch',
            });

            const start = new PointerEvent(
                'pointerdown',
                pointer(from.x + from.width / 2, from.y + from.height / 2),
            );

            tab.dispatchEvent(start);

            const steps = 10;

            for (let step = 1; step <= steps; step += 1) {
                const x =
                    from.x +
                    from.width / 2 +
                    ((to.x + to.width / 2 - (from.x + from.width / 2)) * step) / steps;
                const y =
                    from.y +
                    from.height / 2 +
                    ((to.y + to.height / 2 - (from.y + from.height / 2)) * step) / steps;

                tab.dispatchEvent(new PointerEvent('pointermove', pointer(x, y)));
            }

            target.dispatchEvent(
                new PointerEvent('pointerup', pointer(to.x + to.width / 2, to.y + to.height / 2)),
            );
        },
        { name, index },
    );

    await expect(group.getByRole('tab', { name })).toBeVisible();
}
