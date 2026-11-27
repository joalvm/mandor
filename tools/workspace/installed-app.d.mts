import type { Page } from '@playwright/test';

export type Installed = {
    /** The folder the app was installed to, which holds the executable. */
    directory: string;
    uninstall: () => Promise<void>;
};

export type OpenApp = {
    page: Page;
    /** Asks the app to quit the way a person closing its window does, and waits for it to go. */
    quit: () => Promise<void>;
    /** Settles when the process has gone, however it went. */
    exited: Promise<void>;
    /** Closes the connection and ends the process if it is still there. */
    close: () => Promise<void>;
};

export function install(installer: string, sandbox: string, executable: string): Promise<Installed>;

export function executableIn(directory: string, executable: string): Promise<string>;

export function installerIn(directory: string): Promise<string>;

export function openInstalled(
    executable: string,
    userDataDir: string,
    env?: Record<string, string>,
): Promise<OpenApp>;

/** The agent of the window of the release installer, read once it opens on its first screen. */
export function releaseAgent(options: {
    installers: string;
    executable: string;
    name: string;
}): Promise<string>;
