import { shell } from 'electron';

/** The browser of the system, where the person already has their session with the provider. */
export function openInSystemBrowser(url: string): Promise<void> {
    return shell.openExternal(url);
}
