/** Whether the caret at `at` just typed the `{{` that opens a token with no close after it. */
export function opensToken(text: string, at: number | null): at is number {
    return (
        at !== null && at >= 2 && text.startsWith('{{', at - 2) && text.slice(at, at + 2) !== '}}'
    );
}
