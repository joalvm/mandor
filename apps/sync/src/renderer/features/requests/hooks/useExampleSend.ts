import { fireAndForget } from '@mandor/shell';

import { cancelItem } from '../lib/cancel-item.js';
import { sendExample } from '../lib/send-example.js';
import type { ExampleView } from './useExample.js';
import { useExampleComparison } from './useExampleComparison.js';

/**
 * What the tab of an example needs to send it: the key and the button send unless a send is in
 * flight, the cut stops that send, and what came back is set against the example as it stands.
 */
export function useExampleSend(resource: string, view: ExampleView | undefined) {
    const { comparison, entry } = useExampleComparison(resource, view?.example);
    const sending = entry.state === 'sending';

    return {
        cancel: () => {
            fireAndForget(cancelItem(resource));
        },
        comparison,
        entry,
        send: () => {
            if (!sending) {
                fireAndForget(sendExample(resource));
            }
        },
        sending,
    };
}
