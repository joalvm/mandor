type Issues = { issues: readonly { path: readonly PropertyKey[]; message: string }[] };

/** The sentences of a refusal of the schema, each one naming the file and the key. */
export function problemsOf(path: string, error: Issues): string[] {
    return error.issues.map((issue) => {
        const key = issue.path.map(String).join('.');

        return `${path}: ${key === '' ? '' : `${key}: `}${issue.message}`;
    });
}
