import type { ImportedScript, RequestScripts } from '@mandor/schema';

/** What a request, a folder or a collection holds of its scripts: its own and the imported. */
export type ScriptsOfPlace = {
    scripts?: RequestScripts | undefined;
    importedScripts?: readonly ImportedScript[] | undefined;
};

/** The two lists once a script moved: no key at all for an imported list left empty. */
export type ConvertedScripts = {
    scripts: RequestScripts | undefined;
    importedScripts: ImportedScript[] | undefined;
};

/**
 * Moves one imported script into the script of the same moment, as the text it is: not one
 * character is translated. A script already there keeps its text and its switch, and the moved
 * one goes after it, past a blank line. Nothing is approved here: the editor asks main again.
 */
export function convertImportedScript(place: ScriptsOfPlace, index: number): ConvertedScripts {
    const imported = place.importedScripts ?? [];
    const moved = imported[index];

    if (moved === undefined) {
        return { scripts: place.scripts, importedScripts: [...imported] };
    }

    const left = imported.filter((_, at) => at !== index);
    const current = place.scripts?.[moved.event];
    const source = joined(current?.source ?? '', moved.source);

    return {
        scripts: { ...place.scripts, [moved.event]: { ...current, source } },
        importedScripts: left.length === 0 ? undefined : left,
    };
}

function joined(before: string, moved: string): string {
    if (before === '') {
        return moved;
    }

    return `${before}${before.endsWith('\n') ? '\n' : '\n\n'}${moved}`;
}
