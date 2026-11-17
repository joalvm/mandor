import type { Logger } from '../log/create-logger.js';
import type { NoticeOutbox } from '../notice/raise-notice.js';

/** A window that died twice inside this many milliseconds is not reloaded a second time. */
const RELOAD_WINDOW_MS = 60_000;

/** A window that does not answer for this long is worth asking the person about. */
const HUNG_AFTER_MS = 10_000;

/** What the dialogs say, by key: the texts live in `faults.json` and main picks the language. */
type FaultText =
    | 'crashedAgainDetail'
    | 'crashedAgainTitle'
    | 'hungDetail'
    | 'hungTitle'
    | 'quit'
    | 'reload'
    | 'reopen'
    | 'wait';

/** A native question with its buttons, by text key; the answer is the index of the one chosen. */
export type FaultQuestion = {
    buttons: readonly FaultText[];
    detail: FaultText;
    title: FaultText;
};

type ProcessGone = { exitCode: number; reason: string; type?: string };

// Methods and not properties, so that the overloads of Electron's `on` are accepted by name.
type Listen<Details> = {
    on(event: string, listener: (event: unknown, details: Details) => void): unknown;
    off(event: string, listener: (event: unknown, details: Details) => void): unknown;
};

/** The slice of a `BrowserWindow` this watches, named structurally so a test needs no Electron. */
export type FaultWindow = {
    webContents: Listen<ProcessGone> & { reload(): void };
};

export type WindowFaultDeps = {
    /** Where the processes of the app other than the window report their death. */
    app: Listen<ProcessGone>;
    /** Asks the person with a native dialog and answers with the index of the button chosen. */
    ask: (question: FaultQuestion) => Promise<number>;
    logger: Logger;
    now: () => number;
    outbox: NoticeOutbox;
    /** Leaves the app, for the person who chose it after the window died twice. */
    quit: () => void;
};

/**
 * Takes the faults of the window from main, where they are visible. A window whose process
 * died is reloaded once, because its tabs are already on disk; one that dies again within a
 * minute is asked about, so a window that cannot stay up never turns into a loop of reloads.
 * A window that stops answering is given ten seconds and then asked about, the way a browser
 * does. The other processes of the app are only written down: Chromium starts the GPU again
 * by itself, and the person has nothing to do about it.
 */
export function watchWindowFaults(window: FaultWindow, deps: WindowFaultDeps): () => void {
    const { webContents } = window;
    let lastGone: number | undefined;
    let episode = 0;
    let hung: ReturnType<typeof setTimeout> | undefined;

    const restart = (): void => {
        webContents.reload();
        deps.outbox.raise('window-restarted', 'warning', undefined, 'window-restarted');
    };

    const askAgain = async (): Promise<void> => {
        const choice = await deps.ask({
            buttons: ['reopen', 'quit'],
            detail: 'crashedAgainDetail',
            title: 'crashedAgainTitle',
        });

        if (choice === 0) {
            restart();
        } else {
            deps.quit();
        }
    };

    const onGone = (_event: unknown, details: ProcessGone): void => {
        if (details.reason === 'clean-exit') {
            return;
        }

        deps.logger.log(
            'error',
            `render-process-gone: reason ${details.reason}, exit code ${String(details.exitCode)}`,
        );

        const again = lastGone !== undefined && deps.now() - lastGone < RELOAD_WINDOW_MS;

        lastGone = deps.now();

        if (again) {
            void askAgain();
        } else {
            restart();
        }
    };

    const askAboutHang = async (mine: number): Promise<void> => {
        const choice = await deps.ask({
            buttons: ['wait', 'reload'],
            detail: 'hungDetail',
            title: 'hungTitle',
        });

        // A native dialog cannot be closed from here, so a window that recovered while it was
        // open leaves an answer about something that is no longer true.
        if (choice === 1 && mine === episode) {
            webContents.reload();
        }
    };

    const onUnresponsive = (): void => {
        deps.logger.log('warn', 'the window stopped responding');
        episode += 1;

        const mine = episode;

        clearTimeout(hung);
        hung = setTimeout(() => {
            void askAboutHang(mine);
        }, HUNG_AFTER_MS);
    };

    const onResponsive = (): void => {
        deps.logger.log('info', 'the window is responding again');
        episode += 1;
        clearTimeout(hung);
    };

    const onChildGone = (_event: unknown, details: ProcessGone): void => {
        deps.logger.log(
            'warn',
            `child-process-gone: ${details.type ?? 'unknown'}, reason ${details.reason}, exit code ${String(details.exitCode)}`,
        );
    };

    webContents.on('render-process-gone', onGone);
    webContents.on('unresponsive', onUnresponsive);
    webContents.on('responsive', onResponsive);
    deps.app.on('child-process-gone', onChildGone);

    return () => {
        clearTimeout(hung);
        webContents.off('render-process-gone', onGone);
        webContents.off('unresponsive', onUnresponsive);
        webContents.off('responsive', onResponsive);
        deps.app.off('child-process-gone', onChildGone);
    };
}
