import { useMessages } from '@mandor/i18n';
import { fireAndForget } from '@mandor/shell';
import { Button, IconButton } from '@mandor/ui';
import { memo } from 'react';

import { useCookieJarScope } from '../../hooks/useCookieJarScope.js';
import { newCookieLine, type CookieDomain } from '../../lib/cookie-domains.js';
import { CookieChip } from '../chip/CookieChip.js';
import { CookieLineEditor } from '../editor/CookieLineEditor.js';

type CookieDomainGroupProps = {
    domain: CookieDomain;
};

/**
 * One domain of the jar: its name and how many cookies it holds, a chip for each, and a way to
 * write a new one. Deleting the domain takes all of its cookies at once, as Postman does; the
 * line open in the editor, when it is of this domain, opens under the chips.
 */
export const CookieDomainGroup = memo(function CookieDomainGroup({
    domain,
}: CookieDomainGroupProps) {
    const labels = useMessages('cookies');
    const { draft, jar, onDraft, onForget } = useCookieJarScope();

    function forget(): void {
        onForget(domain.domain);

        if (draft?.domain === domain.domain) {
            onDraft(null);
        }

        if (domain.cookies.length > 0) {
            fireAndForget(jar.clearDomain(domain.domain));
        }
    }

    return (
        <li className="flex flex-col gap-gap-control py-pad-control" data-part="cookie-domain">
            {/* band-policy: section-inset — the dialog body gives the inset, as to the field above */}
            <div className="flex h-row min-w-0 items-center gap-gap-control">
                <h3 className="min-w-0 truncate text-sm font-medium">{domain.domain}</h3>
                <span className="shrink-0 text-sm text-text-secondary">
                    {labels('count', { count: domain.cookies.length })}
                </span>
                <IconButton
                    className="ms-auto"
                    icon="delete"
                    label={labels('deleteDomain', { domain: domain.domain })}
                    onClick={forget}
                    size="sm"
                />
            </div>
            <ul className="flex flex-wrap items-center gap-gap-tight" data-part="cookie-chips">
                {domain.cookies.map((cookie) => (
                    <CookieChip cookie={cookie} key={`${cookie.path}|${cookie.name}`} />
                ))}
                <li>
                    <Button
                        onClick={() => {
                            onDraft({
                                domain: domain.domain,
                                line: newCookieLine(domain.cookies, new Date()),
                            });
                        }}
                        size="sm"
                        variant="ghost"
                    >
                        {labels('addCookie')}
                    </Button>
                </li>
            </ul>
            <CookieLineEditor domain={domain.domain} />
        </li>
    );
});
