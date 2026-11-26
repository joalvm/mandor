import { useMessages } from '@mandor/i18n';
import { fireAndForget } from '@mandor/shell';
import { Button, Textarea } from '@mandor/ui';

import { useCookieJarScope, type CookieDraft } from '../../hooks/useCookieJarScope.js';

type CookieLineEditorProps = {
    domain: string;
};

/**
 * The `Set-Cookie` line of one cookie of the domain, as Postman opens it: name and value first,
 * then every attribute, written by hand. Saving hands the line to the jar, which reads it as a
 * server of the domain would; a line it cannot read stays open, and a notice says why.
 */
export function CookieLineEditor({ domain }: CookieLineEditorProps) {
    const { draft } = useCookieJarScope();

    if (draft?.domain !== domain) {
        return null;
    }

    return <OpenLine draft={draft} />;
}

/** The line open under the chips of its domain, with its two ways out. */
function OpenLine({ draft }: { draft: CookieDraft }) {
    const labels = useMessages('cookies');
    const { jar, onDraft } = useCookieJarScope();

    // A kept line closes the editor; one the jar did not keep stays open, as it was typed.
    async function save(): Promise<void> {
        if (await jar.put(draft.domain, draft.line, draft.replaces)) {
            onDraft(null);
        }
    }

    return (
        <div className="flex flex-col gap-gap-control" data-part="cookie-line-editor">
            <Textarea
                label={labels('lineOf', { domain: draft.domain })}
                mono
                onValueChange={(line) => {
                    onDraft({ ...draft, line });
                }}
                rows={3}
                value={draft.line}
            />
            <div className="flex items-center justify-end gap-gap-control">
                <Button
                    onClick={() => {
                        onDraft(null);
                    }}
                    size="sm"
                    variant="secondary"
                >
                    {labels('cancel')}
                </Button>
                <Button
                    onClick={() => {
                        fireAndForget(save());
                    }}
                    size="sm"
                    variant="primary"
                >
                    {labels('save')}
                </Button>
            </div>
        </div>
    );
}
