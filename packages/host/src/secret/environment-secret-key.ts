import { secretKey } from '@mandor/vars';

/** The three parts a handler knows before it knows which variable is being named. */
export type SecretPlace = {
    repo: string;
    workspaceId: string;
    environmentId: string;
};

/**
 * The key one secret of one environment is kept under. The derivation itself is pure and lives
 * in `@mandor/vars`; what this adds is the vocabulary of the host, so no handler assembles the
 * four parts by hand and gets their order wrong.
 */
export function environmentSecretKey(place: SecretPlace, name: string): string {
    return secretKey({
        repo: place.repo,
        workspace: place.workspaceId,
        environment: place.environmentId,
        name,
    });
}
