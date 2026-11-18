import type { FolderChainLevel } from '../collection/folder-chain-level.js';
import type { AuthChainLevel } from './auth-chain-level.js';

/** The auth of each level of a folder chain, in the same order: who decides, and what. */
export function authChainOf(chain: readonly FolderChainLevel[]): AuthChainLevel[] {
    return chain.map(({ place, name, settings }) => ({ place, name, auth: settings.auth }));
}
