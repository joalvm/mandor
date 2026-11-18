import { reportFault } from './report-fault.js';

/** What React 19 says beside the error it hands to the root: the components it went through. */
type ErrorInfo = { componentStack?: string | undefined };

type RootErrorOptions = {
    onCaughtError: (error: unknown, info: ErrorInfo) => void;
    onRecoverableError: (error: unknown, info: ErrorInfo) => void;
    onUncaughtError: (error: unknown, info: ErrorInfo) => void;
};

/**
 * The three doors React 19 leaves on a root for the errors of render: one nothing caught, which
 * unmounts the whole root and leaves the window blank, one a boundary caught, and one React
 * recovered from by itself. By default they only reach the console; here they reach the log.
 */
export function rootErrorOptions(): RootErrorOptions {
    return {
        onCaughtError: (error, info) => {
            reportFault('react-caught', error, info.componentStack);
        },
        onRecoverableError: (error, info) => {
            reportFault('react-recoverable', error, info.componentStack);
        },
        onUncaughtError: (error, info) => {
            reportFault('react-uncaught', error, info.componentStack);
        },
    };
}

/**
 * What no React boundary can see: an error thrown from an event handler or a timer, and a
 * promise nobody caught. Both end in the log, whatever else the window does about them.
 */
export function watchRendererFaults(
    target: Pick<Window, 'addEventListener' | 'removeEventListener'>,
): () => void {
    const onError = (event: ErrorEvent): void => {
        reportFault('window-error', event.error ?? event.message);
    };

    const onRejection = (event: PromiseRejectionEvent): void => {
        reportFault('unhandled-rejection', event.reason);
    };

    target.addEventListener('error', onError);
    target.addEventListener('unhandledrejection', onRejection);

    return () => {
        target.removeEventListener('error', onError);
        target.removeEventListener('unhandledrejection', onRejection);
    };
}
