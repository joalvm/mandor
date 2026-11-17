import type { _electron, ElectronApplication, expect } from '@playwright/test';

/** What the Playwright of an app hands over: its launcher, and the assertions the close fails with. */
export type Playwright = { electron: typeof _electron; expect: typeof expect };

export function launchElectron(
    playwright: Playwright,
    options: Parameters<typeof _electron.launch>[0],
): Promise<ElectronApplication>;
