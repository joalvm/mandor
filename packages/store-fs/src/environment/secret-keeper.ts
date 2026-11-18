import type { Environment } from '@mandor/schema';

/** One declared secret on its way out of the repository: its name and the value to keep. */
export type KeptSecret = {
    name: string;
    value: string;
};

/**
 * Where a secret value goes instead of the file. The layout of the disk does not know what the
 * store of the system is, only that handing a value over can refuse; whoever writes an
 * environment brings the port, and a caller that brings none writes no secret value anywhere.
 */
export type SecretKeeper = (secrets: readonly KeptSecret[]) => Promise<void>;

/**
 * Hands every secret value over before a single byte of the file is rewritten. The order is
 * the contract: a store that refuses leaves the file as it was, so the clear value the user
 * had is still somewhere they can read it from. The other order loses the value for good.
 */
export async function keepSecrets(
    keep: SecretKeeper | undefined,
    environment: Pick<Environment, 'variables'>,
): Promise<void> {
    const secrets = environment.variables
        .filter((variable) => variable.secret && variable.value !== '')
        .map((variable): KeptSecret => ({ name: variable.name, value: variable.value }));

    if (keep === undefined || secrets.length === 0) {
        return;
    }

    await keep(secrets);
}
