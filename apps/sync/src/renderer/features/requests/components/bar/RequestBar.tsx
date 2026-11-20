import { AddressField } from '@mandor/env';
import { useMessages } from '@mandor/i18n';
import { CloseIcon, SendIcon } from '@mandor/icons';
import { type Environment, METHOD_PATTERN, STANDARD_METHODS, type Variable } from '@mandor/schema';
import { AddressBar, Button, MethodPicker } from '@mandor/ui';

type RequestBarProps = {
    environment: Environment | undefined;
    method: string;
    onCancel: () => void;
    onMethod: (method: string) => void;
    /** Sees a paste into the url before it lands; `true` means it took the text. */
    onPasteText: (text: string) => boolean;
    onSend: () => void;
    onUrl: (url: string) => void;
    /** The variables the url names and nobody declared, handed over to be declared. */
    onVariablesChange: (variables: readonly Variable[]) => void;
    /** A send is in flight: the button that sent is the one that cuts it. */
    sending: boolean;
    url: string;
};

/**
 * The line of the request: what it says it is and where it goes, fused into one address bar, and
 * the button that sends it beside it, as tall as the address. What is done with the request as a
 * whole lives on the row of its trail above. A method the schema took but the picker does not
 * list keeps its place in the list, so what the disk says is never a lie the interface cannot
 * show; one the list never offered is typed where the method stands.
 */
export function RequestBar({
    environment,
    method,
    onCancel,
    onMethod,
    onPasteText,
    onSend,
    onUrl,
    onVariablesChange,
    sending,
    url,
}: RequestBarProps) {
    const labels = useMessages('requests');

    return (
        <div
            className="flex shrink-0 items-center gap-gap-control pt-0.5 pr-2.5 pb-1.5 pl-pad-panel"
            data-part="request-bar"
        >
            <AddressBar className="flex-1">
                <MethodPicker
                    accepts={(typed) => METHOD_PATTERN.test(typed)}
                    label={labels('method')}
                    methods={STANDARD_METHODS}
                    onValueChange={onMethod}
                    otherField={labels('otherMethodField')}
                    otherLabel={labels('otherMethod')}
                    value={method}
                />
                <AddressField
                    environment={environment}
                    label={labels('url')}
                    onChange={onUrl}
                    onPasteText={onPasteText}
                    onVariablesChange={onVariablesChange}
                    value={url}
                />
            </AddressBar>
            <SendButton onCancel={onCancel} onSend={onSend} sending={sending} />
        </div>
    );
}

export function SendButton({
    onCancel,
    onSend,
    sending,
}: Pick<RequestBarProps, 'onCancel' | 'onSend' | 'sending'>) {
    const labels = useMessages('requests');

    if (sending) {
        return (
            <Button onClick={onCancel} size="lg" variant="secondary">
                <CloseIcon size="sm" />
                {labels('abort')}
            </Button>
        );
    }

    return (
        <Button onClick={onSend} size="lg" variant="primary">
            <SendIcon size="sm" />
            {labels('send')}
        </Button>
    );
}
