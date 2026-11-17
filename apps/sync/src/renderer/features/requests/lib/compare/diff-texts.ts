export type DiffTexts = {
    /** What the example expects, the left pane. */
    expected: string;
    /** What came, the right pane. */
    received: string;
};

function laidOut(text: string): string {
    return JSON.stringify(JSON.parse(text), null, 2);
}

/**
 * The two texts the diff editor sets side by side. JSON is laid out the same way on both sides,
 * so the editor marks what moved and not how it was spaced; any other text goes as it is.
 */
export function diffTextsOf(expected: string, received: string, json: boolean): DiffTexts {
    if (!json) {
        return { expected, received };
    }

    return { expected: laidOut(expected), received: laidOut(received) };
}
