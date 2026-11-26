import { useMessages } from '@mandor/i18n';

import type { CookieDomain } from '../../lib/cookie-domains.js';
import { CookieDomainGroup } from './CookieDomainGroup.js';

type CookieDomainListProps = {
    domains: readonly CookieDomain[];
    /** Whether main has answered: until then there is nothing to say, not even that it is empty. */
    loaded: boolean;
    /** Whether the field narrows the domains, so an empty list means none matched. */
    narrowed: boolean;
};

/** The domains of the jar, a group each; or why there are none to show. */
export function CookieDomainList({ domains, loaded, narrowed }: CookieDomainListProps) {
    if (!loaded) {
        return null;
    }

    if (domains.length === 0) {
        return <NoDomains narrowed={narrowed} />;
    }

    return (
        <ul className="flex flex-col gap-gap-group" data-part="cookie-domains">
            {domains.map((domain) => (
                <CookieDomainGroup domain={domain} key={domain.domain} />
            ))}
        </ul>
    );
}

/** An empty jar says how it fills; a field that matched nothing says only that. */
function NoDomains({ narrowed }: { narrowed: boolean }) {
    const labels = useMessages('cookies');

    if (narrowed) {
        return (
            <p className="text-text-secondary" data-part="cookie-jar-empty">
                {labels('noMatch')}
            </p>
        );
    }

    return (
        <p className="text-text-secondary" data-part="cookie-jar-empty">
            <span className="text-text-primary">{labels('emptyTitle')}</span>
            <span> · {labels('emptyBody')}</span>
        </p>
    );
}
