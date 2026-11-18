import { useMessages } from '@mandor/i18n';

import type { InheritedAuth } from '../lib/inherited-auth.js';

/** Who rules among the levels above, in words: the scheme and its level, or that nobody does. */
export function useInheritedAuthLabel(owner: InheritedAuth | null): string {
    const labels = useMessages('requests');
    const types = useMessages('auth');

    if (owner === null) {
        return labels('authChainNone');
    }

    return labels('authInheritedFrom', { name: owner.name, scheme: types(owner.scheme) });
}
