/**
 * The id of the row of a command inside the list that carries `listId`, so the field that walks
 * the list can point at the row it stands on while the focus stays in the field.
 */
export function paletteRowId(listId: string, commandId: string): string {
    return `${listId}-${commandId}`;
}
