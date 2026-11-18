import { useMessages } from '@mandor/i18n';
import { fireAndForget, useFailureToast } from '@mandor/shell';
import { IconButton } from '@mandor/ui';

import { clearScriptVariables } from '../../register-script-variable-commands.js';

type ForgetScriptVariablesButtonProps = {
    workspaceId: string;
};

/**
 * The way out of what scripts set, from the line that says a script moved where something went:
 * the same act as the command, which forgets them in main and then in the window. A refusal is
 * told, and the window keeps showing what main still holds.
 */
export function ForgetScriptVariablesButton({ workspaceId }: ForgetScriptVariablesButtonProps) {
    const labels = useMessages('commands');
    const notifyFailure = useFailureToast();

    return (
        <IconButton
            icon="delete"
            label={labels('clearScriptVariables')}
            onClick={() => {
                fireAndForget(
                    clearScriptVariables(workspaceId).then((code) => {
                        if (code !== null) {
                            notifyFailure(code);
                        }
                    }),
                );
            }}
        />
    );
}
