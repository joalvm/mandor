/** Delivers a push to every listener a test has subscribed, the way main would to the window. */
export function emitTo<Push>(handlers: ReadonlySet<(push: Push) => void>): (push: Push) => void {
    return (push) => {
        for (const handler of handlers) {
            handler(push);
        }
    };
}
