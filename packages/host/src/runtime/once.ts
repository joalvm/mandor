/**
 * Both `window-all-closed` and `before-quit` reach the disposer, and a normal quit fires both.
 * Removing a handler twice throws, so the second call has to find nothing left to do.
 */
export function once(act: () => void): () => void {
    let done = false;

    return () => {
        if (done) {
            return;
        }

        done = true;
        act();
    };
}
