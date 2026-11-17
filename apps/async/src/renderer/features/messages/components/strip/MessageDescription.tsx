import { DocDescription } from '@mandor/docs';
import { useMessages } from '@mandor/i18n';

type MessageDescriptionProps = {
    onChange: (description: string) => void;
    resource: string;
    value: string;
};

/**
 * What this message is for, read and written where it is used. The model is keyed by the
 * resource and not by the panel, so the same item opened twice is one text and one undo.
 */
export function MessageDescription({ onChange, resource, value }: MessageDescriptionProps) {
    const messages = useMessages('messages');

    return (
        <div className="h-full min-h-0" data-part="message-description">
            <DocDescription
                label={messages('descriptionEditor')}
                modelKey={`message-description-${resource}`}
                onChange={onChange}
                value={value}
            />
        </div>
    );
}
