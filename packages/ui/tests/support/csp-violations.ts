import type { Page } from '@playwright/test';

/**
 * Everything the policy of the window refused from here on, as the browser reported it and with
 * the script that asked. A refused sheet or attribute breaks nothing loudly: the element is drawn
 * anyway, without the look it asked for, and the console line is the only trace it leaves.
 */
export function watchCspViolations(page: Page): readonly string[] {
    const refused: string[] = [];

    page.on('console', (message) => {
        const text = message.text();

        if (text.includes('Content Security Policy')) {
            const where = message.location();

            refused.push(`${text} @ ${where.url}:${String(where.lineNumber)}`);
        }
    });

    return refused;
}
