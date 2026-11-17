import type { EditorVariableHover } from '@mandor/ui';
import { useCallback } from 'react';

import { useHoverGrace, type HoverGrace } from './useHoverGrace.js';

export type EditorVariablePopover = HoverGrace & {
    /** What the editor reports under the pointer, or that it left. */
    onHover: (hover: EditorVariableHover | null) => void;
};

/**
 * The variable of an editor document the pointer is on, with the grace around it. The editor
 * waits on its own before it reports a token, so the popover follows the report at once.
 */
export function useEditorVariableHover(): EditorVariablePopover {
    const { controls, hover } = useHoverGrace();
    const { cancel, schedule } = hover;

    const onHover = useCallback(
        (next: EditorVariableHover | null): void => {
            if (controls.held()) {
                return;
            }

            if (next === null) {
                schedule();

                return;
            }

            cancel();
            controls.show(next);
        },
        [cancel, controls, schedule],
    );

    return { ...hover, onHover };
}
