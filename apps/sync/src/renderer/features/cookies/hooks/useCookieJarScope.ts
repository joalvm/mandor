import { createContext, useContext } from 'react';

import type { CookieIdentity, CookieJar } from './useCookieJar.js';

/** The line open in the editor: which domain it goes under, and the cookie it was opened from. */
export type CookieDraft = {
    domain: string;
    line: string;
    replaces?: CookieIdentity | undefined;
};

/**
 * What every part of the open jar dialog shares, and dies with it: the jar, the one line open in
 * the editor, and the way to forget a domain the dialog added and that holds nothing.
 */
type CookieJarScope = {
    draft: CookieDraft | null;
    jar: CookieJar;
    onDraft: (draft: CookieDraft | null) => void;
    onForget: (domain: string) => void;
};

export const CookieJarScopeContext = createContext<CookieJarScope | null>(null);

/** The scope of the jar dialog a part is drawn in; a part drawn outside one is a bug. */
export function useCookieJarScope(): CookieJarScope {
    const scope = useContext(CookieJarScopeContext);

    if (scope === null) {
        throw new Error('A part of the cookie jar is drawn outside its dialog');
    }

    return scope;
}
