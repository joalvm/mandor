import { useMessages } from '@mandor/i18n';
import { fireAndForget } from '@mandor/shell';
import { Button, Dialog, DialogBody, DialogFooter } from '@mandor/ui';
import { useState } from 'react';

import { useCookieJar } from '../../hooks/useCookieJar.js';
import { CookieJarScopeContext, type CookieDraft } from '../../hooks/useCookieJarScope.js';
import { cookieDomainsOf, domainsMatching } from '../../lib/cookie-domains.js';
import { CookieDomainForm } from '../domain/CookieDomainForm.js';
import { CookieDomainList } from '../domain/CookieDomainList.js';
import { CookieClearDialog } from './CookieClearDialog.js';

type CookieJarDialogProps = {
    environmentId: string | null;
    onClose: () => void;
    workspaceId: string;
};

/**
 * The jar of one environment, the way Postman lays it out: a field that narrows the domains or
 * adds one, each domain with its cookies, and a cookie opened as the `Set-Cookie` line a server
 * would send. A domain added here lives only in the dialog until a cookie is written to it.
 */
export function CookieJarDialog({ environmentId, onClose, workspaceId }: CookieJarDialogProps) {
    const labels = useMessages('cookies');
    const jar = useCookieJar({ environmentId, workspaceId });
    const [added, setAdded] = useState<readonly string[]>([]);
    const [draft, setDraft] = useState<CookieDraft | null>(null);
    const [text, setText] = useState('');
    const [clearing, setClearing] = useState(false);
    const domains = cookieDomainsOf(jar.cookies ?? [], added);
    const scope = {
        draft,
        jar,
        onDraft: setDraft,
        onForget: (domain: string) => {
            setAdded((known) => known.filter((each) => each !== domain));
        },
    };

    return (
        <div data-part="cookie-jar-dialog">
            {/* modal-policy: short-config-form */}
            <Dialog
                closeLabel={labels('close')}
                onOpenChange={(open) => {
                    if (!open) {
                        onClose();
                    }
                }}
                open
                title={labels('title')}
            >
                <CookieJarScopeContext value={scope}>
                    <DialogBody>
                        <CookieDomainForm
                            onAdd={(domain) => {
                                setAdded((known) => [...new Set([...known, domain])]);
                            }}
                            onTextChange={setText}
                            text={text}
                        />
                        <CookieDomainList
                            domains={domainsMatching(domains, text)}
                            loaded={jar.cookies !== null}
                            narrowed={text.trim() !== ''}
                        />
                    </DialogBody>
                </CookieJarScopeContext>
                <DialogFooter>
                    <Button
                        disabled={(jar.cookies ?? []).length === 0}
                        onClick={() => {
                            setClearing(true);
                        }}
                        size="md"
                        variant="secondary"
                    >
                        {labels('clear')}
                    </Button>
                </DialogFooter>
            </Dialog>
            <CookieClearDialog
                onCancel={() => {
                    setClearing(false);
                }}
                onConfirm={() => {
                    setClearing(false);
                    setDraft(null);
                    fireAndForget(jar.clear());
                }}
                open={clearing}
            />
        </div>
    );
}
