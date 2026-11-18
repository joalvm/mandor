import type { Environment } from '@mandor/schema';

/**
 * What the picker of environments says: the one chosen by its name, the default of the workspace
 * marked as such when none was chosen, or the word for none.
 */
export function pickerLabel(
    chosen: Environment | undefined,
    ruling: Environment | undefined,
    asDefault: (name: string) => string,
    none: string,
): string {
    if (chosen !== undefined) {
        return chosen.name;
    }

    return ruling === undefined ? none : asDefault(ruling.name);
}
