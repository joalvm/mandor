/** What finds elements under it by a selector: a page of Playwright, or one of its locators. */
type Scope<Found> = { locator: (selector: string) => Found };

/**
 * The lines an editor draws, inside the part of the window that holds it: where an end-to-end
 * run clicks to type, and what it reads back. The input of the editor is a textarea its lines
 * cover, so it takes no click. The editor is of this package, and so is the one place that knows
 * how it lays out its text: the runs of both apps come here for it.
 */
export function editorLines<Found>(scope: Scope<Found>, part: string): Found {
    return scope.locator(`[data-part="${part}"] .monaco-editor .view-lines`);
}
