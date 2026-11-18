import { useLanguage, useMessages } from '@mandor/i18n';
import type { ErrorCode } from '@mandor/ipc';
import type { AuthConfig } from '@mandor/schema';
import { useFailureToast, useShellStore } from '@mandor/shell';
import { Button } from '@mandor/ui';
import type { ReactNode } from 'react';

import { useTokenStatus } from '../../hooks/useTokenStatus.js';
import { tokenStateText } from '../../lib/token-state-text.js';

type TokenStatusProps = {
    /** The level as the editor holds it: the token is asked for before it is saved. */
    own: AuthConfig;
    environmentId: string | null;
    parentPath: string | null;
};

/**
 * What the window knows about the token of an OAuth2 level — whether there is one and until
 * when — with what to do about it, laid as one more row of the form: the state is the value of
 * the row, read on the line of its name, and the actions follow it. Forgetting is offered only
 * while there is a token to forget. The token itself never gets here.
 */
export function TokenStatus({ own, environmentId, parentPath }: TokenStatusProps): ReactNode {
    const messages = useMessages('auth');
    const language = useLanguage();
    const notifyFailure = useFailureToast();
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);

    const fail = (code: ErrorCode): void => {
        notifyFailure(code);
    };

    const { status, busy, fetch, forget } = useTokenStatus(
        { workspaceId: workspaceId ?? '', environmentId, own, parentPath },
        fail,
    );

    if (workspaceId === null) {
        return null;
    }

    const held = status.state !== 'none';

    return (
        <div
            className="grid min-w-0 grid-cols-form-row items-start gap-gap-group"
            data-part="auth-token-status"
        >
            <p className="flex min-h-field items-center text-sm text-text-primary">
                {messages('currentToken')}
            </p>
            <div
                className="flex min-h-field min-w-0 flex-wrap items-center gap-gap-control"
                data-part="auth-token-body"
            >
                <p className="text-sm text-text-secondary" data-part="auth-token-state">
                    {tokenStateText(status, messages, language)}
                </p>
                <Button loading={busy} onClick={fetch} variant="secondary">
                    {messages('getToken')}
                </Button>
                <ForgetToken busy={busy} forget={forget} held={held} />
            </div>
        </div>
    );
}

function ForgetToken({ busy, forget, held }: { busy: boolean; forget: () => void; held: boolean }) {
    const messages = useMessages('auth');

    if (!held) {
        return null;
    }

    return (
        <Button loading={busy} onClick={forget} variant="ghost">
            {messages('forgetToken')}
        </Button>
    );
}
