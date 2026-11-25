import type { AppAbout } from '@mandor/ipc';

/**
 * What a reader pastes into a report of a fault: who the app is, what runs it and on what.
 * It is not translated: it is read by whoever answers the report, in whatever language they use.
 */
export function aboutReport(about: AppAbout): string {
    return [
        `${about.name} ${about.version}`,
        `Electron ${about.electron} · Chromium ${about.chrome} · Node ${about.node}`,
        `Platform ${about.platform} ${about.system} ${about.arch}`,
    ].join('\n');
}
