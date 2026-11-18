import { useMessages } from '@mandor/i18n';
import type { CookieRow } from '@mandor/ipc';
import { IconButton, Input, TableRowActions } from '@mandor/ui';
import { memo, useState } from 'react';

type CookieJarRowProps = {
    cookie: CookieRow;
    onCopy: (text: string) => void;
    onDelete: (cookie: CookieRow) => void;
    onSave: (cookie: CookieRow, value: string) => void;
};

/**
 * One cookie of the jar. The value changes in place: the pencil swaps it for a field, Enter or the
 * check writes it, and the cross puts the old one back. Nothing else of the cookie can be edited,
 * because what identifies it is what the server set.
 */
export const CookieJarRow = memo(function CookieJarRow({
    cookie,
    onCopy,
    onDelete,
    onSave,
}: CookieJarRowProps) {
    const labels = useMessages('cookies');
    const [draft, setDraft] = useState<string | null>(null);

    function save(): void {
        if (draft !== null) {
            onSave(cookie, draft);
        }

        setDraft(null);
    }

    return (
        <tr data-part="cookie-jar-row">
            <td>{cookie.name}</td>
            <td className="text-text-secondary">
                {cookie.domain}
                {cookie.path}
            </td>
            <td>
                <CookieValue cookie={cookie} draft={draft} onChange={setDraft} onEnter={save} />
            </td>
            <TableRowActions>
                <IconButton
                    icon="copy"
                    label={labels('copy')}
                    onClick={() => {
                        onCopy(cookie.value);
                    }}
                    size="sm"
                />
                <CookieEditButtons
                    draft={draft}
                    onCancel={() => {
                        setDraft(null);
                    }}
                    onEdit={() => {
                        setDraft(cookie.value);
                    }}
                    onSave={save}
                />
                <IconButton
                    icon="delete"
                    label={labels('delete')}
                    onClick={() => {
                        onDelete(cookie);
                    }}
                    size="sm"
                />
            </TableRowActions>
        </tr>
    );
});

function CookieValue({
    cookie,
    draft,
    onChange,
    onEnter,
}: {
    cookie: CookieRow;
    draft: string | null;
    onChange: (value: string) => void;
    onEnter: () => void;
}) {
    const labels = useMessages('cookies');

    if (draft === null) {
        return cookie.value;
    }

    return (
        <Input
            label={labels('valueOf', { name: cookie.name })}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    onEnter();
                }
            }}
            onValueChange={onChange}
            value={draft}
        />
    );
}

function CookieEditButtons({
    draft,
    onCancel,
    onEdit,
    onSave,
}: {
    draft: string | null;
    onCancel: () => void;
    onEdit: () => void;
    onSave: () => void;
}) {
    const labels = useMessages('cookies');

    if (draft === null) {
        return <IconButton icon="edit" label={labels('edit')} onClick={onEdit} size="sm" />;
    }

    return (
        <>
            <IconButton icon="check" label={labels('save')} onClick={onSave} size="sm" />
            <IconButton icon="close" label={labels('cancel')} onClick={onCancel} size="sm" />
        </>
    );
}
