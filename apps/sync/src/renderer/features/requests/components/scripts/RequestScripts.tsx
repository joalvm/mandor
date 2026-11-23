import { ScriptsByEvent } from '@mandor/collections';
import { REQUEST_SCRIPT_EVENTS, type RequestItem } from '@mandor/schema';

import { requestPartsOf } from '../../lib/request-parts.js';

type RequestScriptsProps = {
    request: RequestItem;
    /** Who owns the texts: two views of one request share their documents. */
    resource: string;
    /** What changed in the request, as a patch: the owner decides how and when it is written. */
    onChange: (changes: Partial<RequestItem>) => void;
};

/**
 * The scripts of a request, by moment of the send: the moments in a column, the script of the one
 * open beside them. What a document brought is there, in its moment, not yet approved.
 */
export function RequestScripts({ request, resource, onChange }: RequestScriptsProps) {
    return (
        <div className="flex h-full min-h-0 flex-col gap-gap-control" data-part="request-scripts">
            <ScriptsByEvent
                events={REQUEST_SCRIPT_EVENTS}
                onChange={(scripts) => {
                    onChange({ scripts });
                }}
                place={{
                    level: 'request',
                    workspaceId: requestPartsOf(resource)?.workspaceId ?? '',
                }}
                resource={resource}
                scripts={request.scripts}
            />
        </div>
    );
}
