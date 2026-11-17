import { variableNameSchema, type Variable } from '@mandor/schema';

/**
 * Whether a row stops the list from being written: it says something — a name or a value —
 * under a name no interpolation would ever match. A row left wholly empty says nothing and
 * stops nothing; it is the typist's next line, not a variable yet.
 */
export function blocksTheWrite(variable: Pick<Variable, 'name' | 'value'>): boolean {
    if (variable.name === '' && variable.value === '') {
        return false;
    }

    return !variableNameSchema.safeParse(variable.name).success;
}

/**
 * The list as it can be read back, or null while a row still blocks it. The empty rows stay
 * on screen and out of the file: the last good list stays on disk until the typist finishes.
 */
export function writableVariables(variables: readonly Variable[]): Variable[] | null {
    if (variables.some(blocksTheWrite)) {
        return null;
    }

    return variables.filter((variable) => variable.name !== '');
}
