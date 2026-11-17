/**
 * How the packaged binary is built. The fuses are flipped at package time, in the installer
 * work; this is the configuration they are flipped from, so the two apps cannot drift apart.
 */
export const ELECTRON_FUSES = {
    /** Without this the binary doubles as a node runtime that will run any script handed to it. */
    runAsNode: false,
    /** Cookies at rest are encrypted with the key of the operating system. */
    enableCookieEncryption: true,
    /** NODE_OPTIONS can preload a module. An environment variable must not inject code. */
    enableNodeOptionsEnvironmentVariable: false,
    /** `--inspect` opens a debugger with the whole main process behind it. */
    enableNodeCliInspectArguments: false,
    /** The asar is checked against its own hash before anything inside it runs. */
    enableEmbeddedAsarIntegrityValidation: true,
    /** Only the asar is the app. A loose directory next to the binary is not. */
    onlyLoadAppFromAsar: true,
    /** `file:` stays an ordinary scheme: no fetch, no cross-origin reads. */
    grantFileProtocolExtraPrivileges: false,
} as const;
