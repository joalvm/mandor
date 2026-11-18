import { fireAndForget, useTab } from '@mandor/shell';
import type { RequestExample } from '@mandor/schema';
import { useState } from 'react';

import type { ExampleComparison } from '../../lib/compare/compare-example.js';
import { sendExampleWithoutScripts } from '../../lib/send-example.js';
import type { SendEntry, SendOutcome } from '../../responses.slice.js';
import { SendStatus } from '../response/SendStatus.js';
import { ExampleDiffBar } from './ExampleDiffBar.js';
import { ExampleDiffEditor } from './ExampleDiffEditor.js';
import { ExampleDiffEmpty } from './ExampleDiffEmpty.js';
import { ExampleDiffFacts } from './ExampleDiffFacts.js';
import { ExampleDiffSettled } from './ExampleDiffSettled.js';

type ExampleDiffProps = {
    comparison: ExampleComparison | undefined;
    entry: SendEntry;
    example: RequestExample;
    onAccept?: (() => void) | undefined;
};

/**
 * The Differences tab: nothing to say until the example is sent, the line of the send that
 * failed as the request says it, and once an answer came, the band over the editor that marks
 * the lines it differs in. What the schema refuses of it is the Schema tab's to list.
 */
export function ExampleDiff({ comparison, entry, ...rest }: ExampleDiffProps) {
    if (entry.state === 'failed') {
        return <FailedSend entry={entry} />;
    }

    if (comparison === undefined) {
        return <ExampleDiffEmpty />;
    }

    if (comparison.quiet) {
        return <ExampleDiffSettled />;
    }

    return <Compared comparison={comparison} {...rest} />;
}

/** A send that failed, with the way out of a script that broke it: the example again, bare. */
function FailedSend({ entry }: { entry: SendOutcome }) {
    const { resource } = useTab();

    return (
        <SendStatus
            entry={entry}
            onSendWithoutScripts={() => {
                fireAndForget(sendExampleWithoutScripts(resource));
            }}
        />
    );
}

type ComparedProps = Omit<ExampleDiffProps, 'comparison' | 'entry'> & {
    comparison: ExampleComparison;
};

function Compared({ comparison, example, onAccept }: ComparedProps) {
    const [wrap, setWrap] = useState(true);

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col" data-part="example-diff">
            <ExampleDiffBar
                comparison={comparison}
                example={example}
                onAccept={onAccept}
                onWrap={setWrap}
                wrap={wrap}
            />
            <ExampleDiffFacts facts={comparison.facts} />
            <ExampleDiffEditor comparison={comparison} example={example} wrap={wrap} />
        </div>
    );
}
