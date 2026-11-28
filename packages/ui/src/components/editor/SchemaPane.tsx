import { useImperativeHandle, useMemo, useRef, type PropsWithChildren, type Ref } from 'react';

import type { EditorLanguage } from '../../editor/editor-language.js';
import type { EditorOptions } from '../../editor/editor-options.js';
import { withUncheckedPatternMarks } from '../../editor/unchecked-pattern-marks.js';
import { IconButton } from '../button/IconButton.js';
import { CodeEditor, type CodeEditorHandle } from './CodeEditor.js';
import { SchemaIssues, type SchemaIssueList } from './SchemaIssues.js';
import { SchemaSettings, type SchemaSettingsLabels } from './SchemaSettings.js';

/** What the pane says about itself and its actions. The words belong to whoever mounts it. */
type SchemaPaneLabels = {
    editor: string;
    /** The words of the generate button, which exists only while there is a generation. */
    generate?: string | undefined;
    /** The words of the options of the schema; without them the pane offers none. */
    settings?: SchemaSettingsLabels | undefined;
    /** Said over a pattern no check reads; a pane that edits no schema has none to say. */
    uncheckedPattern?: string | undefined;
};

/** Its children lead the strip of actions, before them: where the text comes from, say. */
type SchemaPaneProps = PropsWithChildren<{
    /** The document of the mounter, keyed and answered on every change. */
    editor: {
        key: string;
        language: EditorLanguage;
        onValueChange: (value: string) => void;
        value: string;
    };
    /** What the value the schema judges breaks; with nothing broken, the pane lists nothing. */
    issues?: SchemaIssueList | undefined;
    /** The text of the value the schema judges, read for what came where a rule broke. */
    judged?: string | undefined;
    labels: SchemaPaneLabels;
    /** The generation the pane offers, or nothing when there is nothing to generate from. */
    onGenerate?: (() => void) | undefined;
    options: EditorOptions;
    /** The mounter's way to the editor, to lay it out from a button of its own. */
    ref?: Ref<SchemaPaneHandle> | undefined;
}>;

/** The editor of a pane, for the mounter that lays it out from a button of its own. */
export type SchemaPaneHandle = {
    readonly editor: CodeEditorHandle | null;
};

/**
 * One editor with its strip of actions and, docked under it, the rules the value it judges breaks. The
 * pane owns the editor and nothing else: the text is the mounter's, and the generate button
 * asks it for the generation — the pane cannot know where a document comes from or what could
 * be written from it, so whoever mounts the pane decides whether the button is there at all.
 * The options write into the same text, and a broken rule taken from the list is selected in it.
 */
export function SchemaPane({
    children,
    editor,
    issues,
    judged,
    labels,
    onGenerate,
    options,
    ref,
}: SchemaPaneProps) {
    const editorRef = useRef<CodeEditorHandle>(null);
    const said = labels.uncheckedPattern;
    const checked = useMemo(() => withUncheckedPatternMarks(options, said), [options, said]);

    useImperativeHandle(ref, () => ({
        get editor() {
            return editorRef.current;
        },
    }));

    return (
        <div className="flex h-full min-h-0 flex-col items-stretch" data-part="schema-pane">
            <SchemaPaneActions editor={editor} labels={labels} onGenerate={onGenerate}>
                {children}
            </SchemaPaneActions>
            <SchemaIssues
                issues={issues}
                judged={judged}
                onPick={(issue) => {
                    editorRef.current?.selectPointer(issue.schemaPath);
                }}
                schema={editor.value}
            >
                <div className="h-full min-h-0" data-part="schema-pane-editor">
                    <CodeEditor
                        labels={labels}
                        language={editor.language}
                        modelKey={editor.key}
                        onValueChange={editor.onValueChange}
                        options={checked}
                        ref={editorRef}
                        value={editor.value}
                    />
                </div>
            </SchemaIssues>
        </div>
    );
}

type SchemaPaneActionsProps = PropsWithChildren<{
    editor: SchemaPaneProps['editor'];
    labels: SchemaPaneLabels;
    onGenerate: SchemaPaneProps['onGenerate'];
}>;

function SchemaPaneActions({ children, editor, labels, onGenerate }: SchemaPaneActionsProps) {
    const generates = onGenerate !== undefined && labels.generate !== undefined;

    if (children === undefined && !generates && labels.settings === undefined) {
        return null;
    }

    return (
        <div
            className="flex h-section shrink-0 items-center justify-end gap-gap-control px-pad-panel"
            data-part="schema-pane-actions"
        >
            <PaneLead>{children}</PaneLead>
            <PaneSettings editor={editor} labels={labels.settings} />
            <PaneGenerate label={labels.generate} onGenerate={onGenerate} />
        </div>
    );
}

/** What the mounter puts at the start of the strip, pushing the actions to its far end. */
function PaneLead({ children }: PropsWithChildren) {
    if (children === undefined) {
        return null;
    }

    return (
        <div
            className="me-auto flex min-w-0 items-center gap-gap-control"
            data-part="schema-pane-lead"
        >
            {children}
        </div>
    );
}

type PaneSettingsProps = {
    editor: SchemaPaneProps['editor'];
    labels: SchemaPaneLabels['settings'];
};

function PaneSettings({ editor, labels }: PaneSettingsProps) {
    if (labels === undefined) {
        return null;
    }

    return <SchemaSettings labels={labels} onChange={editor.onValueChange} text={editor.value} />;
}

type PaneGenerateProps = {
    label: SchemaPaneLabels['generate'];
    onGenerate: SchemaPaneProps['onGenerate'];
};

function PaneGenerate({ label, onGenerate }: PaneGenerateProps) {
    if (onGenerate === undefined || label === undefined) {
        return null;
    }

    return <IconButton icon="format" label={label} onClick={onGenerate} />;
}
