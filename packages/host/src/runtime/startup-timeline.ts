import type { Logger } from '../log/create-logger.js';

/** The six moments of a start, in the order they happen. */
type StartupStage =
    | 'host-start'
    | 'app-ready'
    | 'origin-open'
    | 'window-created'
    | 'ready-to-show'
    | 'window-ready';

/** What the timeline holds a mark under: a second `window-ready` is a reload, not a start. */
type MarkName = StartupStage | 'window-reloaded';

export type StartupTimeline = {
    /** Notes the moment a stage is reached, and says under which name it was kept. */
    mark: (stage: StartupStage) => MarkName;
    /** The marks so far as one line of the log, or just one of them when it is named. */
    line: (only?: MarkName) => string;
};

/**
 * Counts the start of the app in milliseconds from the start of the process, which is what
 * `performance.now()` counts in node. Cost: one line of the log per start; use: the only thing
 * a person who says "it takes long to open" can send, and the figure the budgets of CI read.
 */
export function createStartupTimeline(
    now: () => number = () => performance.now(),
): StartupTimeline {
    const marks = new Map<MarkName, number>();

    return {
        mark: (stage) => {
            const name =
                stage === 'window-ready' && marks.has('window-ready') ? 'window-reloaded' : stage;

            marks.set(name, now());

            return name;
        },
        line: (only) => {
            const shown = [...marks].filter(([name]) => only === undefined || name === only);

            return `startup ${shown.map(([name, ms]) => `${name}=${String(Math.round(ms))}`).join(' ')}`;
        },
    };
}

/** The marks a line shows: a first start shows every one, a reload only its own. */
function shownOf(name: MarkName): MarkName | undefined {
    if (name === 'window-ready') {
        return undefined;
    }

    return name;
}

/** What the window saying it is ready writes down: the whole start once, and each reload alone. */
export function logWindowReady(timeline: StartupTimeline, logger: Logger): void {
    const name = timeline.mark('window-ready');

    logger.log('info', timeline.line(shownOf(name)));
}
