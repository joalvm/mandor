import { DocDescription } from '@mandor/docs';
import { useMessages } from '@mandor/i18n';

type ConnectionDescriptionProps = {
    connectionId: string;
    onChange: (description: string) => void;
    value: string;
};

/**
 * What this connection is for, read and written where it is used. The model is keyed by the
 * connection and not by the panel, so the same item opened twice is the same text and the same
 * undo.
 */
export function ConnectionDescription({
    connectionId,
    onChange,
    value,
}: ConnectionDescriptionProps) {
    const messages = useMessages('connections');

    return (
        <div className="h-full min-h-0" data-part="connection-description">
            <DocDescription
                label={messages('descriptionEditor')}
                modelKey={`description-${connectionId}`}
                onChange={onChange}
                value={value}
            />
        </div>
    );
}
