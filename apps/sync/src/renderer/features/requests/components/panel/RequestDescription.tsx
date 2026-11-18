import { DocDescription } from '@mandor/docs';
import { useMessages } from '@mandor/i18n';

type RequestDescriptionProps = {
    onChange: (description: string) => void;
    resource: string;
    value: string;
};

/**
 * What this request is for, read and written where it is used. The model is keyed by the
 * resource and not by the panel, so the same request opened twice is one text and one undo.
 */
export function RequestDescription({ onChange, resource, value }: RequestDescriptionProps) {
    const messages = useMessages('requests');

    return (
        <div className="h-full min-h-0" data-part="request-description">
            <DocDescription
                label={messages('descriptionEditor')}
                modelKey={`request-description-${resource}`}
                onChange={onChange}
                value={value}
            />
        </div>
    );
}
