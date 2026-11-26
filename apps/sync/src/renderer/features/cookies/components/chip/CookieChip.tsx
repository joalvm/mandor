import { useMessages } from '@mandor/i18n';
import type { CookieRow } from '@mandor/ipc';
import { fireAndForget } from '@mandor/shell';
import { Button, IconButton, cn } from '@mandor/ui';
import { memo } from 'react';

import { useCookieJarScope } from '../../hooks/useCookieJarScope.js';
import { isOpenIn } from '../../lib/cookie-domains.js';

type CookieChipProps = {
    cookie: CookieRow;
};

/**
 * One cookie of a domain, by its name: pressing it opens its line in the editor, the cross
 * deletes it. Two cookies of one name on two paths read the same; the line tells them apart.
 */
export const CookieChip = memo(function CookieChip({ cookie }: CookieChipProps) {
    const labels = useMessages('cookies');
    const { draft, jar, onDraft } = useCookieJarScope();
    const open = isOpenIn(cookie, draft);

    return (
        <li
            className={cn(
                'flex items-center rounded-md',
                open ? 'bg-surface-selected' : 'bg-surface-control',
            )}
            data-part="cookie-chip"
        >
            <Button
                aria-pressed={open}
                onClick={() => {
                    onDraft({
                        domain: cookie.domain,
                        line: cookie.line,
                        replaces: { domain: cookie.domain, name: cookie.name, path: cookie.path },
                    });
                }}
                size="sm"
                variant="ghost"
            >
                {cookie.name}
            </Button>
            <IconButton
                icon="close"
                label={labels('deleteCookie', { name: cookie.name })}
                onClick={() => {
                    if (open) {
                        onDraft(null);
                    }

                    fireAndForget(jar.remove(cookie));
                }}
                size="xs"
            />
        </li>
    );
});
