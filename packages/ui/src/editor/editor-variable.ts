/** How a variable of the document reads: filled in, empty, unknown, still being typed, or secret. */
type EditorVariableTone = 'empty' | 'missing' | 'open' | 'resolved' | 'secret';

/** Where a variable sits in the text, how it reads, and the name the pointer reports. */
export type EditorVariable = {
    from: number;
    to: number;
    tone: EditorVariableTone;
    name?: string | undefined;
};

/** The variable under the pointer and the box it is drawn in, for a popover to anchor on. */
export type EditorVariableHover = { name: string; rect: DOMRect };

/** Reads the variables out of a text. */
type VariablesOf = (text: string) => readonly EditorVariable[];

/** Told each time the pointer reaches a named variable, and told `null` when it leaves. */
export type OnVariableHover = (hover: EditorVariableHover | null) => void;

/** The variables of a document: who reads them and who hears what the pointer found. */
export type EditorVariables = {
    onHover?: OnVariableHover | undefined;
    variablesOf: VariablesOf;
};
