import { join } from 'node:path';

/**
 * Points git at configuration files that do not exist, so the suite sees the same git on
 * every machine. Without this a test passes or fails depending on what the developer
 * happens to have in `~/.gitconfig`.
 */
export function withoutInheritedConfig(dir: string): void {
    process.env['GIT_CONFIG_GLOBAL'] = join(dir, 'no-global-config');
    process.env['GIT_CONFIG_SYSTEM'] = join(dir, 'no-system-config');
}

/**
 * A fixed author, the way a test repo gets one. CI machines have no identity configured,
 * so a commit that relies on the ambient one fails there and nowhere else.
 */
export function withFixedIdentity(): void {
    process.env['GIT_AUTHOR_NAME'] = 'Mandor Test';
    process.env['GIT_AUTHOR_EMAIL'] = 'test@mandor.local';
    process.env['GIT_COMMITTER_NAME'] = 'Mandor Test';
    process.env['GIT_COMMITTER_EMAIL'] = 'test@mandor.local';
}

/** A machine that has no identity at all, which is what a fresh CI runner looks like. */
export function withoutIdentity(): void {
    delete process.env['GIT_AUTHOR_NAME'];
    delete process.env['GIT_AUTHOR_EMAIL'];
    delete process.env['GIT_COMMITTER_NAME'];
    delete process.env['GIT_COMMITTER_EMAIL'];
}
