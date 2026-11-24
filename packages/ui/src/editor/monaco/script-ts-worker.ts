// The typings of the worker are ambient, and an import cannot carry an ambient declaration into
// the projects that read this file: only a reference does.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./typescript-internals.d.ts" />
import { typescript } from 'monaco-editor/languages/features/typescript/lib/typescriptServices.js';
import type { Diagnostic } from 'monaco-editor/languages/features/typescript/register.js';
import {
    TypeScriptWorker,
    type CompletionDetails,
    type CompletionInfo,
    type QuickInfo,
    type SignatureHelp,
    type Snapshot,
} from 'monaco-editor/languages/features/typescript/tsWorker.js';

type Declared = { text: string; version: number };

/** A text the service reads whole, out of one string. */
function snapshotOf(text: string): Snapshot {
    return {
        getChangeRange: () => undefined,
        getLength: () => text.length,
        getText: (start, end) => text.substring(start, end),
    };
}

/**
 * The service of the scripts. Each moment shows a script its own `mandor`, so the names a script
 * finds cannot be a library every document shares: two scripts of two moments open side by side
 * would declare `mandor` twice. Each script gets the declarations of its moment after its own
 * text instead, and every script is a module, so what one declares the other never sees. The
 * text of the script keeps its offsets, and whatever the service says about the part it was not
 * written in is the service's business, not the reader's.
 */
export class ScriptTsWorker extends TypeScriptWorker {
    readonly #declared = new Map<string, Declared>();

    /** The declarations a script is read against, from now on. */
    setDeclarations(fileName: string, text: string): Promise<void> {
        const version = (this.#declared.get(fileName)?.version ?? 0) + 1;

        this.#declared.set(fileName, { text, version });

        return Promise.resolve();
    }

    forgetDeclarations(fileName: string): Promise<void> {
        this.#declared.delete(fileName);

        return Promise.resolve();
    }

    /** A new declaration is a new text, even when the script did not change. */
    override getScriptVersion(fileName: string): string {
        const name = this.#nameOf(fileName);
        const own = super.getScriptVersion(name);
        const declared = this.#declared.get(name);

        return declared === undefined ? own : `${own}.${String(declared.version)}`;
    }

    override getScriptSnapshot(fileName: string): Snapshot | undefined {
        const name = this.#nameOf(fileName);
        const own = super.getScriptSnapshot(name);
        const declared = this.#declared.get(name);

        if (own === undefined || declared === undefined) {
            return own;
        }

        // A line of its own: a comment left open on the last line of the script ends there.
        return snapshotOf(`${own.getText(0, own.getLength())}\n${declared.text}`);
    }

    override async getSyntacticDiagnostics(fileName: string): Promise<Diagnostic[]> {
        if (!this.#holds(fileName)) {
            return [];
        }

        return this.#written(fileName, await super.getSyntacticDiagnostics(fileName));
    }

    override async getSemanticDiagnostics(fileName: string): Promise<Diagnostic[]> {
        if (!this.#holds(fileName)) {
            return [];
        }

        return this.#written(fileName, await super.getSemanticDiagnostics(fileName));
    }

    override getCompletionsAtPosition(
        fileName: string,
        position: number,
    ): Promise<CompletionInfo | undefined> {
        return this.#holds(fileName)
            ? super.getCompletionsAtPosition(fileName, position)
            : Promise.resolve(undefined);
    }

    override getCompletionEntryDetails(
        fileName: string,
        position: number,
        entry: string,
    ): Promise<CompletionDetails | undefined> {
        return this.#holds(fileName)
            ? super.getCompletionEntryDetails(fileName, position, entry)
            : Promise.resolve(undefined);
    }

    override getSignatureHelpItems(
        fileName: string,
        position: number,
        options: Record<string, never>,
    ): Promise<SignatureHelp | undefined> {
        return this.#holds(fileName)
            ? super.getSignatureHelpItems(fileName, position, options)
            : Promise.resolve(undefined);
    }

    override getQuickInfoAtPosition(
        fileName: string,
        position: number,
    ): Promise<QuickInfo | undefined> {
        return this.#holds(fileName)
            ? super.getQuickInfoAtPosition(fileName, position)
            : Promise.resolve(undefined);
    }

    /**
     * The name the window gave the script the service asks about. The service asks by the path it
     * makes of a name, with no empty step and none that steps back, and the window names a script
     * after the key of its document, whole: a key that holds `//` reaches the service as another
     * name, and the window's is the one the worker knows.
     */
    #nameOf(fileName: string): string {
        return (
            super
                .getScriptFileNames()
                .find((name) => typescript.normalizePath(name) === fileName) ?? fileName
        );
    }

    /**
     * Whether the window still holds the script. A question travels while the window closes it,
     * and the service has nothing to read for one it let go of: the answer is that there is none.
     */
    #holds(fileName: string): boolean {
        return super.getScriptSnapshot(fileName) !== undefined;
    }

    /** What falls in the text somebody wrote; a mark of the program as a whole has no place. */
    #written(fileName: string, diagnostics: readonly Diagnostic[]): Diagnostic[] {
        const length = super.getScriptSnapshot(fileName)?.getLength() ?? 0;

        return diagnostics.filter(({ start }) => start !== undefined && start < length);
    }
}
