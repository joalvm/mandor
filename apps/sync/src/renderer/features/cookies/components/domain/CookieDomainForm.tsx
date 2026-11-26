import { useMessages } from '@mandor/i18n';
import { Button, Input } from '@mandor/ui';

import { domainOf } from '../../lib/cookie-domains.js';

type CookieDomainFormProps = {
    text: string;
    onAdd: (domain: string) => void;
    onTextChange: (text: string) => void;
};

/**
 * The field over the domains: what it says narrows them, and adding it makes a domain of it for a
 * first cookie. A URL pasted whole adds its host. The text stays, so the domain just added is the
 * one in sight.
 */
export function CookieDomainForm({ text, onAdd, onTextChange }: CookieDomainFormProps) {
    const labels = useMessages('cookies');

    function add(): void {
        const domain = domainOf(text);

        if (domain !== null) {
            onAdd(domain);
        }
    }

    return (
        <div className="flex items-center gap-gap-control" data-part="cookie-domain-form">
            <Input
                className="min-w-0 flex-1"
                label={labels('domain')}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        add();
                    }
                }}
                onValueChange={onTextChange}
                placeholder={labels('domainHint')}
                value={text}
            />
            <Button onClick={add} size="md" variant="secondary">
                {labels('addDomain')}
            </Button>
        </div>
    );
}
