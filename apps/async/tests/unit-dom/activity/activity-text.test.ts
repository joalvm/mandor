import { describe, expect, it } from 'vitest';

import { activityText } from '../../../src/renderer/activity/activity-text.js';
import { faultEntryOf, messageEntryOf, scriptEntryOf } from '../support/activity-entries.js';

describe('the text an entry of the timeline carries', () => {
    it('reads a frame by its event and its whole payload', () => {
        expect(activityText(messageEntryOf({ data: '{"ok":true}', event: 'saludo' }))).toBe(
            'saludo {"ok":true}',
        );
    });

    it('reads a frame that never was text by its event alone', () => {
        expect(activityText(messageEntryOf({ binary: true, data: 'AAEC', event: 'bytes' }))).toBe(
            'bytes',
        );
    });

    it('reads a fault by its code', () => {
        expect(activityText(faultEntryOf('ws-send-failed'))).toBe('ws-send-failed');
    });

    /** What main said has no text of its own: a code is not what anybody would search for. */
    it('reads a note of the scripts by its moment and what the scripts themselves wrote', () => {
        const entry = scriptEntryOf({
            logs: [
                { level: 'log', text: 'ticket ok' },
                { level: 'warn', notice: 'no-reconnect' },
            ],
            tests: [{ name: 'has ticket', passed: true }],
            error: { message: 'x is not defined', errorName: 'ReferenceError' },
        });

        expect(activityText(entry)).toBe(
            'onBeforeConnect ticket ok has ticket ReferenceError x is not defined',
        );
    });
});
