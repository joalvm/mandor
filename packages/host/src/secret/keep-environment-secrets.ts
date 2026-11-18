import type { SecretKeeper } from '@mandor/store-fs';

import { storeSecret } from '../origin/secret-store.js';
import { environmentSecretKey, type SecretPlace } from './environment-secret-key.js';
import { rememberSecret } from './secret-index.js';

export type KeepSecretsDeps = {
    userDataDir: string;
    root: string;
    place: SecretPlace;
};

/** Where the values of one file go: the key of each name, an environment's or the globals'. */
export type KeepSecretsAtDeps = {
    userDataDir: string;
    root: string;
    keyOf: (name: string) => string;
};

/**
 * The port `store-fs` asks for before it rewrites an environment: every declared value goes to
 * the keychain of the system first, and the file is rewritten without them afterwards. A store
 * that refuses stops the write, which is what leaves the value where the user can still read it.
 */
export function keepEnvironmentSecrets(deps: KeepSecretsDeps): SecretKeeper {
    return keepSecretsAt({
        userDataDir: deps.userDataDir,
        root: deps.root,
        keyOf: (name) => environmentSecretKey(deps.place, name),
    });
}

/** The same port for any file whose secrets travel without their values: the globals too. */
export function keepSecretsAt(deps: KeepSecretsAtDeps): SecretKeeper {
    return async (secrets) => {
        for (const secret of secrets) {
            const key = deps.keyOf(secret.name);

            if ((await storeSecret(deps.userDataDir, key, secret.value)) === 'disk') {
                await rememberSecret(deps.root, key);
            }
        }
    };
}
