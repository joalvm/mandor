import { AddressField } from '@mandor/env';
import { useMessages } from '@mandor/i18n';
import { CloseIcon, SendIcon } from '@mandor/icons';
import { type Environment, METHOD_PATTERN, STANDARD_METHODS, type Variable } from '@mandor/schema';
import { AddressActions, AddressBar, Button, IconButton, MethodPicker } from '@mandor/ui';

type RequestBarProps = {
    environment: Environment | undefined;
    method: string;
    onCancel: () => void;
    /**
     * Keeps the answer of the last send as an example of the request. Undefined while there is
     * no answer to keep: the icon is not drawn then.
     */
    onKeep: (() => void) | undefined;
    onMethod: (method: string) => void;
    onOpenCode: () => void;
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
 * the button that sends it beside it. The end of the address holds what is done with the request
 * as a whole: its code, and keeping the answer of the last send once there is one. A method the schema took but the picker does not list
 * keeps its place in the list, so what the disk says is never a lie the interface cannot show;
 * one the list never offered is typed where the method stands.
 */
export function RequestBar({
    environment,
    method,
    onCancel,
    onKeep,
    onMethod,
    onOpenCode,
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
            className="flex h-header shrink-0 items-center gap-gap-control px-pad-panel"
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
                <AddressActions>
                    <IconButton icon="code" label={labels('code')} onClick={onOpenCode} />
                    <SaveResponseButton onKeep={onKeep} />
                </AddressActions>
            </AddressBar>
            <SendButton onCancel={onCancel} onSend={onSend} sending={sending} />
        </div>
    );
}

function SaveResponseButton({ onKeep }: { onKeep: RequestBarProps['onKeep'] }) {
    const labels = useMessages('requests');

    if (onKeep === undefined) {
        return null;
    }

    return <IconButton icon="save" label={labels('saveResponse')} onClick={onKeep} />;
}

export function SendButton({
    onCancel,
    onSend,
    sending,
}: Pick<RequestBarProps, 'onCancel' | 'onSend' | 'sending'>) {
    const labels = useMessages('requests');

    if (sending) {
        return (
            <Button onClick={onCancel} variant="secondary">
                <CloseIcon size="sm" />
                {labels('abort')}
            </Button>
        );
    }

    return (
        <Button onClick={onSend} variant="primary">
            <SendIcon size="sm" />
            {labels('send')}
        </Button>
    );
}
