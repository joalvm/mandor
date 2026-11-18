/**
 * Files main may hold open for reading at once. A walk of the repo asks for every file of a
 * folder together, and the system opens each before any is read: a folder of thousands of items
 * passed the limit of the process (256 on macOS, 1024 on most Linux desktops), and every file past
 * it failed with EMFILE and left the tree as unreadable items. Enough to keep the disk busy.
 */
export const MAX_OPEN_FILES = 32;

let open = 0;
const waiting: (() => void)[] = [];

/** Waits for a slot. A slot given back goes straight to the one waiting longest. */
async function taken(): Promise<void> {
    if (open < MAX_OPEN_FILES) {
        open += 1;

        return;
    }

    await new Promise<void>((resolve) => {
        waiting.push(resolve);
    });
}

function givenBack(): void {
    const next = waiting.shift();

    if (next === undefined) {
        open -= 1;

        return;
    }

    next();
}

/** Runs the work of one open file once a slot is free, and frees it however the work ends. */
export async function withOpenFileSlot<T>(work: () => Promise<T>): Promise<T> {
    await taken();

    try {
        return await work();
    } finally {
        givenBack();
    }
}
