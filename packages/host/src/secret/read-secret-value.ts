/**
 * The one thing main needs from the store of the system while it resolves: the value kept
 * under a key, or nothing. Named as a port so what resolves a connection never imports the
 * keychain, and a test can stand a whole open up without an Electron process around it.
 */
export type ReadSecretValue = (key: string) => Promise<string | null>;
