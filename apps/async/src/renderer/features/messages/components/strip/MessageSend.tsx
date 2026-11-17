import { useMessages } from '@mandor/i18n';
import { Button, IconButton, Popover, PopoverPanel, PopoverTrigger } from '@mandor/ui';
import { useState } from 'react';

import type { OutboundTarget } from '../../../../outbound/outbound-port.js';

import { onlyLiveTarget } from '../../lib/only-live-target.js';

type MessageSendProps = {
    onSend: (target: OutboundTarget) => void;
    /** Read when the button is pressed, so the list is never a stale copy of what is up. */
    targets: () => OutboundTarget[];
};

/**
 * Where this message goes. One live connection is not a choice and takes it without asking;
 * several are, and so is having none, because then the choice is which one to open. Which one
 * was picked last time is never remembered: it would turn a send into a surprise the day two
 * are up.
 */
export function MessageSend({ onSend, targets }: MessageSendProps) {
    const messages = useMessages('messages');
    const [choices, setChoices] = useState<OutboundTarget[] | null>(null);

    function onOpenChange(open: boolean): void {
        if (!open) {
            setChoices(null);

            return;
        }

        const found = targets();
        const only = onlyLiveTarget(found);
        const live = found.filter((each) => each.live);

        if (only !== undefined) {
            onSend(only);

            return;
        }

        setChoices(live.length === 0 ? found : live);
    }

    return (
        <Popover onOpenChange={onOpenChange} open={choices !== null}>
            <PopoverTrigger>
                <IconButton icon="send" label={messages('send')} />
            </PopoverTrigger>
            <PopoverPanel label={messages('sendTargets')}>
                <div className="flex flex-col" data-part="message-send">
                    <SendNowhere choices={choices} />
                    {(choices ?? []).map((each) => (
                        <Button
                            className="justify-start"
                            key={each.id}
                            onClick={() => {
                                setChoices(null);
                                onSend(each);
                            }}
                            size="sm"
                            variant="ghost"
                        >
                            {each.name}
                        </Button>
                    ))}
                </div>
            </PopoverPanel>
        </Popover>
    );
}

function SendNowhere({ choices }: { choices: OutboundTarget[] | null }) {
    const messages = useMessages('messages');

    if (choices?.length !== 0) {
        return null;
    }

    return <p className="text-sm text-text-secondary">{messages('sendNowhere')}</p>;
}
