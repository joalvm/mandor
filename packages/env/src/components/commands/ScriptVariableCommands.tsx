import { useFailureToast } from '@mandor/shell';
import { useEffect, useEffectEvent } from 'react';

import { registerScriptVariableCommands } from '../../register-script-variable-commands.js';

/**
 * Nothing to draw. It declares the command that forgets what scripts set from inside the tree
 * that can raise a notice: a command runs outside React, the toast lives inside it, and a
 * component mounted under the provider is what closes the gap between the two.
 */
export function ScriptVariableCommands(): null {
    const notifyFailure = useEffectEvent(useFailureToast());

    useEffect(
        () =>
            registerScriptVariableCommands((code) => {
                notifyFailure(code);
            }),
        [],
    );

    return null;
}
