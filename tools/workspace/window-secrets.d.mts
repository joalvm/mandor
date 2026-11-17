import type { Page } from '@playwright/test';

/** The globals that hold the secret, and the spellings of it the document shows. */
export function secretInWindow(
    page: Page,
    secret: string,
): Promise<{ held: string[]; shown: string[] }>;
