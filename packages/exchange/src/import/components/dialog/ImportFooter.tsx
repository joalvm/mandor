import { useMessages } from '@mandor/i18n';
import { Button } from '@mandor/ui';

type ImportFooterProps = {
    applying: boolean;
    disabled: boolean;
    onApply: () => void;
};

/** The last band of the import: the go, and nothing else to read before it. */
export function ImportFooter({ applying, disabled, onApply }: ImportFooterProps) {
    const messages = useMessages('import');

    return (
        <Button disabled={disabled} loading={applying} onClick={onApply} variant="primary">
            {messages('import')}
        </Button>
    );
}
