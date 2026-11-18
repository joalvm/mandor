import type { RequestItem } from '@mandor/schema';

import { requestPartsOf } from '../../lib/request-parts.js';
import { EventScripts } from './EventScripts.js';
import { RequestImportedScripts } from './RequestImportedScripts.js';

type RequestScriptsProps = {
    request: RequestItem;
    /** Who owns the texts: two views of one request share their documents. */
    resource: string;
    /** What changed in the request, as a patch: the owner decides how and when it is written. */
    onChange: (changes: Partial<RequestItem>) => void;
};

/**
 * The scripts of a request, one tab per moment of the send. What a document brought stays under
 * them, as the text it is.
 */
export function RequestScripts({ request, resource, onChange }: RequestScriptsProps) {
    return (
        <div className="flex h-full min-h-0 flex-col gap-gap-control" data-part="request-scripts">
            <EventScripts
                level="request"
                onChange={(scripts) => {
                    onChange({ scripts });
                }}
                resource={resource}
                scripts={request.scripts}
                workspaceId={requestPartsOf(resource)?.workspaceId ?? ''}
            />
            <ImportedScripts onChange={onChange} request={request} resource={resource} />
        </div>
    );
}

function ImportedScripts({ request, resource, onChange }: RequestScriptsProps) {
    if ((request.importedScripts ?? []).length === 0) {
        return null;
    }

    return <RequestImportedScripts modelKey={resource} onChange={onChange} parts={request} />;
}
