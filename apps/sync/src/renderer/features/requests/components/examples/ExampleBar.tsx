import { AddressField } from '@mandor/env';
import { useMessages } from '@mandor/i18n';
import type { Environment } from '@mandor/schema';
import { AddressBar, MethodMark, Tooltip } from '@mandor/ui';

import { SendButton } from '../bar/RequestBar.js';

type ExampleBarProps = {
    /** The environment in force: it tones the variables the url names. */
    environment: Environment | undefined;
    method: string;
    /** Cuts the send in flight. Without it, and without `onSend`, the bar draws no button. */
    onCancel?: (() => void) | undefined;
    /** Sends the example. Undefined while it cannot be sent: the button is not drawn then. */
    onSend?: (() => void) | undefined;
    /** What the request the example hangs from is called: where method and url are edited. */
    requestName: string;
    sending?: boolean | undefined;
    url: string;
};

/**
 * The line of the example: the method and the url of the request it hangs from, read and not
 * written, because an example changes what the request sends and never where it goes. The url
 * is painted with the variables as the request paints them, quieter, and none of them opens:
 * resting on it says where to edit them.
 */
export function ExampleBar({
    environment,
    method,
    onCancel,
    onSend,
    requestName,
    sending = false,
    url,
}: ExampleBarProps) {
    const labels = useMessages('requests');

    return (
        <div
            className="flex h-header shrink-0 items-center gap-gap-control px-pad-panel"
            data-part="example-bar"
        >
            <Tooltip content={labels('exampleLocked', { request: requestName })}>
                <span className="flex min-w-0 flex-1 items-center" data-part="example-address">
                    <AddressBar className="flex-1">
                        <span className="flex shrink-0 items-center px-pad-control">
                            <MethodMark method={method} />
                        </span>
                        <AddressField
                            disabled
                            environment={environment}
                            label={labels('url')}
                            onChange={() => undefined}
                            onVariablesChange={() => undefined}
                            value={url}
                        />
                    </AddressBar>
                </span>
            </Tooltip>
            <ExampleSend onCancel={onCancel} onSend={onSend} sending={sending} />
        </div>
    );
}

type ExampleSendProps = Pick<ExampleBarProps, 'onCancel' | 'onSend'> & { sending: boolean };

function ExampleSend({ onCancel, onSend, sending }: ExampleSendProps) {
    if (onSend === undefined || onCancel === undefined) {
        return null;
    }

    return <SendButton onCancel={onCancel} onSend={onSend} sending={sending} />;
}
