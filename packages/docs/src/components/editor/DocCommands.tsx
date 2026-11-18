import { useDocCommands } from '../../hooks/useDocCommands.js';

/**
 * Nothing to draw. It exists so the commands of a doc are declared from inside the tree that can
 * raise a notice: a command runs outside React, the toast lives inside it, and a component
 * mounted under the provider is what closes the gap between the two.
 */
export function DocCommands(): null {
    useDocCommands();

    return null;
}
