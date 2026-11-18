import { AuthEditor, useWorkspaceAuth } from '@mandor/env';
import { useMessages } from '@mandor/i18n';
import type { Connection, Environment, Variable } from '@mandor/schema';
import type { ReactNode } from 'react';

import { HANDSHAKE_SCHEMES } from '../../lib/handshake-schemes.js';
import type { ConnectionWrite } from '../../lib/pending-connection-write.js';

type ConnectionAuthSectionProps = {
    connection: Connection;
    workspaceId: string;
    environment: Environment | undefined;
    onConnectionChange: (changes: ConnectionWrite) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
};

/**
 * The auth of the handshake of this connection: what the connection carries itself, or what it
 * inherits from the workspace — with who carries the one that applies said in plain words.
 */
export function ConnectionAuthSection({
    connection,
    workspaceId,
    environment,
    onConnectionChange,
    onVariablesChange,
}: ConnectionAuthSectionProps): ReactNode {
    const messages = useMessages('auth');
    const { auth } = useWorkspaceAuth(workspaceId);

    return (
        <div className="flex min-w-0 flex-col" data-part="connection-auth">
            <AuthEditor
                environment={environment}
                environmentId={connection.environmentId}
                inheritable
                inheritedLabel={auth === null ? undefined : messages('inheritedFromWorkspace')}
                onChange={(next) => {
                    onConnectionChange({ auth: next });
                }}
                onVariablesChange={onVariablesChange}
                parentPath={null}
                placements={['header', 'query', 'subprotocol']}
                schemes={HANDSHAKE_SCHEMES}
                value={connection.auth}
            />
        </div>
    );
}
