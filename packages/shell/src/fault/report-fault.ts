import { LOG_MESSAGE_MAX, LOG_STACK_MAX, type LogSource } from '@mandor/ipc';

import { bridge } from '../bridge.js';
import { tellWindowConsole } from '../console/window-console.js';

type Fault = { message: string; stack?: string | undefined };

function clip(text: string, ceiling: number): string {
    return text.length > ceiling ? text.slice(0, ceiling) : text;
}

/** What is known of whatever was thrown: a promise can reject with a string, a plain object, anything. */
function faultOf(error: unknown): Fault {
    if (error instanceof Error) {
        return { message: error.message === '' ? error.name : error.message, stack: error.stack };
    }

    if (typeof error === 'string') {
        return { message: error };
    }

    try {
        // Typed as a string, but it answers nothing for `undefined` and for a function.
        const json = JSON.stringify(error) as string | undefined;

        return { message: json ?? String(error) };
    } catch {
        return { message: String(error) };
    }
}

/** Nobody can be told that telling failed: the console is the last place left to say so. */
function lastResort(problem: unknown): void {
    console.error('a fault of the window could not be written in the log', problem);
}

/** A failure React got over by itself is a warning; any other fault is an error. */
function levelOf(source: LogSource): 'error' | 'warn' {
    if (source === 'react-recoverable') {
        return 'warn';
    }

    return 'error';
}

/**
 * Hands main a fault of the window to write in the log, which is the only place the person can
 * later find it, and to the console of the window, where it reads at once. Nothing waits for the answer
 * and nothing is thrown, because the fault already is the problem; a render error also brings
 * the stack of components that led to it, when React gives one.
 */
export function reportFault(source: LogSource, error: unknown, componentStack?: string): void {
    const fault = faultOf(error);
    const stack = [fault.stack, componentStack].filter((part) => part !== undefined).join('\n');
    const level = levelOf(source);
    const message = clip(fault.message, LOG_MESSAGE_MAX);
    const clipped = stack === '' ? undefined : clip(stack, LOG_STACK_MAX);

    tellWindowConsole({ tone: level, text: message, detail: clipped });

    bridge.log
        .write({
            level,
            source,
            message,
            ...(clipped === undefined ? {} : { stack: clipped }),
        })
        .then((answer) => {
            if (!answer.ok) {
                lastResort(answer.error);
            }
        }, lastResort);
}
