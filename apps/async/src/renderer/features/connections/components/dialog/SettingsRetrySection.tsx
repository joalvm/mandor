import type { Connection } from '@mandor/schema';

import { useConnectionOverrides } from '../../hooks/useConnectionOverrides.js';
import type { ConnectionWrite } from '../../lib/pending-connection-write.js';
import { RetryRows } from './RetryRows.js';

type SettingsRetrySectionProps = {
    connection: Connection;
    onConnectionChange: (changes: ConnectionWrite) => void;
};

/**
 * How this connection comes back when the server hangs up, over the policy of the app: the file
 * keeps only what the connection decided, so a later change of the defaults reaches every row
 * it left alone.
 */
export function SettingsRetrySection({
    connection,
    onConnectionChange,
}: SettingsRetrySectionProps) {
    const editing = useConnectionOverrides('retry', connection.retry ?? {}, (retry) => {
        onConnectionChange({ retry });
    });

    return (
        <div className="flex min-w-0 flex-col gap-gap-group" data-part="retry-settings">
            <RetryRows editing={editing} />
        </div>
    );
}
