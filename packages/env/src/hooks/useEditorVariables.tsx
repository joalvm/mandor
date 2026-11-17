import type { Environment, Variable } from '@mandor/schema';
import type { EditorVariables } from '@mandor/ui';
import { useMemo, type ReactNode } from 'react';

import { VariablePopover } from '../components/field/VariablePopover.js';
import { editorVariables } from '../lib/editor-variables.js';
import { useEditorVariableHover } from './useEditorVariableHover.js';
import { useVariableScope } from './useVariableScope.js';

type UseEditorVariablesInput = {
    /** The environment in force: the tones come from it and the popover declares into it. */
    environment: Environment | undefined;
    /** The variables a popover declares, handed over to be written where the environment lives. */
    onVariablesChange: (variables: readonly Variable[]) => void;
};

type EditorVariablesView = {
    /** What the editor reads: put it in the options of every editor that speaks variables. */
    editor: EditorVariables;
    /** The popover of the variable under the pointer, or nothing while it is on none. */
    popover: ReactNode;
};

/**
 * The variables of a code editor, the way a field has them: each `{{name}}` painted in the tone
 * the environment earns it, and the popover to read, edit or create it opens over the one the
 * pointer is on. The editor is one object while nothing it reads changes, so the options it rides
 * in stay put and the editor is not rebuilt on every hover.
 */
export function useEditorVariables({
    environment,
    onVariablesChange,
}: UseEditorVariablesInput): EditorVariablesView {
    const hover = useEditorVariableHover();
    const scope = useVariableScope(environment);
    const editor = useMemo(() => editorVariables(scope, hover.onHover), [scope, hover.onHover]);
    const popover = (
        <VariablePopover
            environment={environment}
            hover={hover}
            onVariablesChange={onVariablesChange}
            scope={scope}
        />
    );

    return { editor, popover };
}
