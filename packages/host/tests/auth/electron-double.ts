import { safeStorageDouble } from '../support/safe-storage-double.js';

/** The `electron` double the handlers see: an available keychain and a spied browser. */
export function electronMock(browser: { openExternal: unknown }): object {
    return { safeStorage: safeStorageDouble(), shell: browser };
}
