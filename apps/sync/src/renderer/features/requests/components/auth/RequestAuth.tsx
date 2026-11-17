import { itemPartsOf } from '@mandor/collections';
import { AuthEditor, useFolderChain } from '@mandor/env';
import {
    authChainOf,
    type Environment,
    itemParentOf,
    type RequestItem,
    type Variable,
} from '@mandor/schema';
import { useShellStore } from '@mandor/shell';

import { useInheritedAuthLabel } from '../../hooks/useInheritedAuthLabel.js';
import { inheritedAuth } from '../../lib/inherited-auth.js';

type RequestAuthProps = {
    environment: Environment | undefined;
    /** What changed in the request, as a patch: the owner decides how and when it is written. */
    onChange: (changes: Partial<RequestItem>) => void;
    /** The variables the auth names and nobody declared, handed over to be declared. */
    onVariablesChange: (variables: readonly Variable[]) => void;
    request: RequestItem;
    resource: string;
};

/**
 * The auth of this request, edited where it stands. While it inherits, the line under the type
 * says which scheme it goes out with and from which folder or workspace, the way the request
 * tools say it; each folder edits its own in its tab.
 */
export function RequestAuth({
    environment,
    onChange,
    onVariablesChange,
    request,
    resource,
}: RequestAuthProps) {
    const parts = itemPartsOf(resource);
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);
    const parentPath = itemParentOf(parts?.path ?? null);
    const inherited = useInheritedAuthLabel(
        inheritedAuth(authChainOf(useFolderChain(workspaceId, parentPath))),
    );

    return (
        <div className="flex min-w-0 flex-col pt-gap-group" data-part="request-auth">
            <AuthEditor
                environment={environment}
                environmentId={environment?.id ?? null}
                inheritable
                inheritedLabel={inherited}
                onChange={(auth) => {
                    onChange({ auth });
                }}
                onVariablesChange={onVariablesChange}
                parentPath={parentPath}
                placements={['header', 'query', 'cookie']}
                value={request.auth}
            />
        </div>
    );
}
