import { fireAndForget } from '@mandor/shell';
import { useStore } from 'zustand';

import { ResponsePanel } from '../../../../response/ResponsePanel.js';
import type { AnswerSchema } from '../../../../response/ResponseSchema.js';
import { scriptOutputStore } from '../../lib/script-output-store.js';
import { sendWithoutScripts } from '../../lib/send-item.js';
import type { SendEntry } from '../../responses.slice.js';
import { ResponseActions } from './ResponseActions.js';
import { SendAnnouncement } from './SendAnnouncement.js';
import { SendStatus } from './SendStatus.js';

type SendResponseProps = {
    entry: SendEntry;
    /** Lets go of the answer of the last send. */
    onClear: () => void;
    resource: string;
    /** The schema of the example the answer stands for, when the request has one of its status. */
    schema?: AnswerSchema | undefined;
};

/**
 * The right half of the request: the answer of the last send once it came, and until then how
 * the send stands. The views of an answer are the same ones the history draws, so what this
 * adds is only where the answer comes from, what can be done with it here, and the schema of
 * the example it stands for.
 */
export function SendResponse({ entry, onClear, resource, schema }: SendResponseProps) {
    return (
        <>
            <SendAnnouncement entry={entry} />
            <SendHalf entry={entry} onClear={onClear} resource={resource} schema={schema} />
        </>
    );
}

function SendHalf({ entry, onClear, resource, schema }: SendResponseProps) {
    if (entry.state === 'done') {
        return <SendAnswer entry={entry} onClear={onClear} resource={resource} schema={schema} />;
    }

    return (
        <SendStatus
            entry={entry}
            onSendWithoutScripts={() => {
                fireAndForget(sendWithoutScripts(resource));
            }}
        />
    );
}

type SendAnswerProps = Omit<SendResponseProps, 'entry'> & {
    entry: Extract<SendEntry, { state: 'done' }>;
};

/**
 * The answer that came, checked against the schema of the example it stands for, under what the
 * scripts changed on the way and with the cases they checked among its sections.
 */
function SendAnswer({ entry, onClear, resource, schema }: SendAnswerProps) {
    const sendId = entry.sendId;
    const tests = useStore(scriptOutputStore, (state) =>
        sendId === undefined ? undefined : state.runs[sendId]?.output?.tests,
    );

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col" data-part="send-answer">
            <SendStatus entry={entry} />
            <div className="min-h-0 flex-1">
                <ResponsePanel
                    resource={resource}
                    response={entry.response}
                    schema={schema}
                    tests={tests !== undefined && tests.length > 0 ? tests : undefined}
                >
                    <ResponseActions onClear={onClear} response={entry.response} />
                </ResponsePanel>
            </div>
        </div>
    );
}
