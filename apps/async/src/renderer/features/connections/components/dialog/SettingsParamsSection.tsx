import { KeyValueTable, keyValueLinesOf, requestLinesOf, type KeyValueColumns } from '@mandor/env';
import { useMessages } from '@mandor/i18n';
import type { Connection, Environment, Variable } from '@mandor/schema';
import { useState } from 'react';

import { effectiveUrlOf } from '../../lib/effective-url.js';
import type { ConnectionWrite } from '../../lib/pending-connection-write.js';

type SettingsParamsSectionProps = {
    connection: Connection;
    environment: Environment | undefined;
    onConnectionChange: (changes: ConnectionWrite) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
};

/** The columns the params table opens with; the reader may take one away for a while. */
const OPENING_COLUMNS: KeyValueColumns = { description: true, value: true };

/**
 * The query the connection dials with, as one table, under the url it composes into. The url
 * keeps owning its path and any query written inside it; the params ride after what the url
 * already carries. The bar reads resolved so a `{{token}}` never has to be traced by hand,
 * and a variable a value names goes to the environment the connection already resolves
 * against — the same one the bar reads.
 */
export function SettingsParamsSection({
    connection,
    environment,
    onConnectionChange,
    onVariablesChange,
}: SettingsParamsSectionProps) {
    const messages = useMessages('connections');
    const [columns, setColumns] = useState<KeyValueColumns>(OPENING_COLUMNS);
    const params = connection.params ?? [];

    return (
        <div className="flex min-w-0 flex-col" data-part="connection-params">
            {/* The composed url is longer than any label: it takes the whole row width, stacked
                under its name, the way the frame template of the websocket reads. */}
            <div
                className="flex min-w-0 flex-col gap-gap-tight border-b border-border-subtle py-3"
                data-part="effective-url"
            >
                <div className="flex min-w-0 flex-col gap-gap-tight">
                    <span className="text-sm text-text-primary">{messages('effectiveUrl')}</span>
                    <span className="text-xs text-text-secondary">
                        {messages('effectiveUrlHelp')}
                    </span>
                </div>
                <p className="min-w-0 truncate font-mono text-xs text-text-primary">
                    {effectiveUrlOf(connection, environment)}
                </p>
            </div>
            <KeyValueTable
                columns={columns}
                environment={environment}
                lines={keyValueLinesOf(params)}
                onColumnsChange={setColumns}
                onLinesChange={(lines) => {
                    onConnectionChange({ params: requestLinesOf(lines, params) });
                }}
                onVariablesChange={onVariablesChange}
                title={messages('sectionParams')}
                typed
            />
        </div>
    );
}
