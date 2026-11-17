import { useEnvironments } from '@mandor/env';
import { useMessages } from '@mandor/i18n';
import { Tooltip } from '@mandor/ui';

import { useSendDestination } from '../../hooks/useSendDestination.js';

/**
 * Who takes the message when the send does not ask: the connection and the environment it resolves
 * against, said before the press. With several up, or none, the press asks and there is nothing
 * to say here. A send that depends on what is open elsewhere is read here, not remembered.
 */
export function MessageDestination() {
    const messages = useMessages('messages');
    const environments = useEnvironments();
    const { environmentId, name } = useSendDestination();

    if (name === null) {
        return null;
    }

    const environment = environments.find((each) => each.id === environmentId)?.name;
    const said =
        environment === undefined
            ? messages('sendThrough', { connection: name })
            : messages('sendThroughIn', { connection: name, environment });

    return (
        <Tooltip content={said}>
            <span
                className="max-w-48 min-w-0 truncate text-sm text-text-secondary"
                data-part="message-destination"
            >
                {said}
            </span>
        </Tooltip>
    );
}
