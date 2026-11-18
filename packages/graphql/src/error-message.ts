/** What a thrown value says: its message when it is an error, whatever it prints as otherwise. */
export function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
