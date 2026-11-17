import {
    KEY_HEADER_NAMES,
    KeyValueTable,
    keyValueLinesOf,
    requestLinesOf,
    type KeyValueColumns,
} from '@mandor/env';
import { useMessages } from '@mandor/i18n';
import type { Connection, Environment, Variable } from '@mandor/schema';
import { useState } from 'react';

import type { ConnectionWrite } from '../../lib/pending-connection-write.js';

type SettingsHeadersSectionProps = {
    connection: Connection;
    environment: Environment | undefined;
    onConnectionChange: (changes: ConnectionWrite) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
};

/** The columns the headers table opens with: what each one carries, without its description. */
const OPENING_COLUMNS: KeyValueColumns = { description: false, value: true };

/**
 * The headers the handshake carries, as one table: each line on or off, with the type its value
 * promises, the same table the params and the headers of a request lay on.
 */
export function SettingsHeadersSection({
    connection,
    environment,
    onConnectionChange,
    onVariablesChange,
}: SettingsHeadersSectionProps) {
    const messages = useMessages('connections');
    const [columns, setColumns] = useState<KeyValueColumns>(OPENING_COLUMNS);
    const { headers } = connection;

    return (
        <div
            className="flex min-w-0 flex-col items-stretch gap-gap-control"
            data-part="headers-settings"
        >
            <p className="py-1 text-xs text-text-secondary">
                {messages('headersHelp', { variables: '{{variables}}' })}
            </p>
            <KeyValueTable
                columns={columns}
                environment={environment}
                keySuggestions={KEY_HEADER_NAMES}
                lines={keyValueLinesOf(headers)}
                onColumnsChange={setColumns}
                onLinesChange={(lines) => {
                    onConnectionChange({ headers: requestLinesOf(lines, headers) });
                }}
                onVariablesChange={onVariablesChange}
                title={messages('headers')}
                typed
            />
        </div>
    );
}
