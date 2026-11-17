import { useMessages } from '@mandor/i18n';
import { Button } from '@mandor/ui';
import type { ReactNode } from 'react';

type ExportFooterProps = {
    /** The document is being written: the go waits, and says so. */
    saving: boolean;
    disabled: boolean;
    onSave: () => void;
};

/** The last band of the export: the go, and nothing else to read before it. */
export function ExportFooter({ saving, disabled, onSave }: ExportFooterProps): ReactNode {
    const messages = useMessages('export');

    return (
        <Button disabled={disabled || saving} loading={saving} onClick={onSave} variant="primary">
            {messages('export')}
        </Button>
    );
}
