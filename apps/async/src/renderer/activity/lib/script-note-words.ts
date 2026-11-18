import type { useMessages } from '@mandor/i18n';
import type { WsScriptNote } from '@mandor/ipc';

type Labels = ReturnType<typeof useMessages<'connections'>>;

type EventKey = 'scriptEventOnBeforeConnect' | 'scriptEventOnConnect' | 'scriptEventOnMessage';

const EVENT_KEYS: Readonly<Record<WsScriptNote['event'], EventKey>> = {
    onBeforeConnect: 'scriptEventOnBeforeConnect',
    onConnect: 'scriptEventOnConnect',
    onMessage: 'scriptEventOnMessage',
};

/** The moment of a connection its scripts ran at, in the words of the interface. */
export function scriptEventWords(event: WsScriptNote['event'], labels: Labels): string {
    return labels(EVENT_KEYS[event]);
}

/** Where the script that broke stopped: the moment, and the line when it was told. */
export function scriptErrorPlace(note: WsScriptNote, labels: Labels): string {
    const line = note.error?.line;
    const parts = [
        scriptEventWords(note.event, labels),
        ...(line === undefined ? [] : [labels('scriptErrorLine', { line })]),
    ];

    return parts.join(' · ');
}

type CountKey = 'scriptLines' | 'scriptSkipped' | 'scriptDropped' | 'scriptSwitchedOffShort';

function countWords(counts: [CountKey, number][], labels: Labels): string[] {
    return counts.filter(([, count]) => count > 0).map(([key, count]) => labels(key, { count }));
}

/**
 * The note in one short line: the moment, then only the figures that are not zero, and whether
 * it opened without secrets or broke. The console has the rest.
 */
export function scriptNoteFigures(note: WsScriptNote, labels: Labels): string {
    const passed = note.tests.filter((test) => test.passed).length;
    const total = note.tests.length;
    const parts = [
        scriptEventWords(note.event, labels),
        ...countWords([['scriptLines', note.logs.length]], labels),
        ...(total === 0 ? [] : [labels('scriptTests', { passed, total })]),
        ...countWords(
            [
                ['scriptSkipped', note.skipped.length],
                ['scriptDropped', note.dropped],
                ['scriptSwitchedOffShort', note.switchedOff],
            ],
            labels,
        ),
        ...(note.secretsOff === undefined ? [] : [labels('scriptNoSecrets')]),
        ...(note.error === undefined ? [] : [labels('scriptFailed')]),
    ];

    return parts.join(' · ');
}
