import type { AppAbout } from '../app/app-about.js';
import type { AppearanceConfigureRequest } from '../appearance/appearance-configure.js';
import type { Empty, Result } from '../result/result.js';

/** What the window asks of the app itself: who it is, where its licenses are kept, how it looks. */
export type AppArea = {
    /** The name, the version and the runtimes under it, as the process reports them. */
    about: () => Promise<Result<AppAbout>>;
    /** Shows the licenses the install carries. The window names no path: main knows where they are. */
    openLicenses: () => Promise<Result<Empty>>;
    /** Hands over the colour scheme the system parts of the window are drawn in. */
    configureAppearance: (input: AppearanceConfigureRequest) => Promise<Result<Empty>>;
};
