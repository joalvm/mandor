import { itemPartsOf } from '@mandor/collections';
import {
    KEY_HEADER_NAMES,
    KeyValueTable,
    keyValueLinesOf,
    requestLinesOf,
    type KeyValueColumns,
    useFolderChain,
} from '@mandor/env';
import { useMessages } from '@mandor/i18n';
import {
    authChainOf,
    type Environment,
    inheritedHeaders,
    itemParentOf,
    type RequestItem,
    type RequestLine,
    type Variable,
} from '@mandor/schema';
import { useShellStore } from '@mandor/shell';
import { useState, type ReactNode } from 'react';

import { headerAutoLinesOf } from '../../lib/header-auto-lines.js';
import { headerAutoRowOf, headerAutoSectionOf } from '../../lib/header-auto-row.js';
import { InheritedHeaders } from './InheritedHeaders.js';

type RequestHeadersProps = {
    environment: Environment | undefined;
    /** What changed in the headers, as a patch: the owner decides how and when it is written. */
    onChange: (headers: RequestLine[]) => void;
    /** The section a deep link from a row the app adds lands on. */
    onFollow: (section: 'auth' | 'body') => void;
    /** The variables the headers name and nobody declared, handed over to be declared. */
    onVariablesChange: (variables: readonly Variable[]) => void;
    request: RequestItem;
    resource: string;
};

/** The columns the headers table opens with: what each pair carries, without its description. */
const OPENING_COLUMNS: KeyValueColumns = { description: false, value: true };

/**
 * The headers of the request as one table: keys the suggestions complete, and the rows the
 * request itself adds — the one its auth stands for, the type its body carries, the defaults
 * a solid send lays, the ones the layer that dials computes — said struck out when a written
 * row takes them over. A row the app adds speaks its way out: the deep link lands on the tab
 * where that thing is set. Under the table, what the levels above hand down.
 */
export function RequestHeaders({
    environment,
    onChange,
    onFollow,
    onVariablesChange,
    request,
    resource,
}: RequestHeadersProps): ReactNode {
    const labels = useMessages('requests');
    const [columns, setColumns] = useState<KeyValueColumns>(OPENING_COLUMNS);
    const parts = itemPartsOf(resource);
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);
    const levels = useFolderChain(workspaceId, itemParentOf(parts?.path ?? null));
    const { inherited } = inheritedHeaders(levels, request.headers);
    const laid = headerAutoLinesOf(request, authChainOf(levels), inherited);
    const autoLines = laid.map((each) => headerAutoRowOf(each, labels));

    return (
        <div className="flex min-h-0 flex-col gap-gap-group" data-part="request-headers">
            <KeyValueTable
                autoLines={autoLines}
                columns={columns}
                environment={environment}
                keySuggestions={KEY_HEADER_NAMES}
                lines={keyValueLinesOf(request.headers)}
                onAutoFollow={(id) => {
                    const section = headerAutoSectionOf(laid, id);

                    if (section !== undefined) {
                        onFollow(section);
                    }
                }}
                onColumnsChange={setColumns}
                onLinesChange={(lines) => {
                    onChange(requestLinesOf(lines, request.headers));
                }}
                onVariablesChange={onVariablesChange}
                title={labels('headers')}
                typed
            />
            <InheritedHeaders headers={inherited} />
        </div>
    );
}
