import type { AppArea } from '../bridge/app-area.js';
import { success } from '../result/success.js';

/** The app area a test gets when it says nothing about the app: a named build with no runtimes of note. */
export function defaultApp(): AppArea {
    return {
        about: () =>
            Promise.resolve(
                success({
                    chrome: '0.0.0',
                    electron: '0.0.0',
                    name: 'Mandor',
                    node: '0.0.0',
                    platform: 'linux',
                    version: '0.0.0',
                }),
            ),
        openLicenses: () => Promise.resolve(success({})),
        configureAppearance: () => Promise.resolve(success({})),
    };
}
