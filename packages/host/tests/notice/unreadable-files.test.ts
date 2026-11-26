import { join } from 'node:path';

import { CHANNELS, noticePushSchema } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createNoticeOutbox } from '../../src/notice/raise-notice.js';
import { forgetUnreadable, reportUnreadable } from '../../src/notice/unreadable-files.js';
import {
    closeRepo,
    openRepo,
    spyWindow,
    type WindowSpy,
} from '../../src/testing/handler-harness.js';

const ROOT = join('home', 'ana', 'Mandor', 'realtime', 'local');
const REASON = 'YAMLParseError: Nested mappings are not allowed';

/** A file nobody could read: where it lives, and the name it carries when the text still has one. */
function broken(file: string, name?: string) {
    const path = join(ROOT, 'workspaces', 'pagos', 'collections', file);

    return name === undefined ? { path, message: REASON } : { path, message: REASON, name };
}

let window: WindowSpy;
let logged: string[];
const logger = {
    log: (_level: string, message: string) => {
        logged.push(message);
    },
    flush: () => Promise.resolve(),
};

beforeEach(() => {
    window = spyWindow();
    logged = [];
    openRepo(ROOT);
});

afterEach(() => {
    closeRepo();
});

function pushed(): unknown[] {
    return window.sent.map(([, message]) => message);
}

describe('reporting files that could not be read', () => {
    it('logs the path and the reason, and tells the window the names without any path', () => {
        const outbox = createNoticeOutbox(window);

        reportUnreadable(outbox, logger, [broken('x9k2m4p7q1w3.yaml', 'Login')]);

        expect(logged).toEqual([
            `${join(ROOT, 'workspaces', 'pagos', 'collections', 'x9k2m4p7q1w3.yaml')} could not be read: ${REASON}`,
        ]);
        expect(window.sent).toHaveLength(1);
        expect(window.sent[0]?.[0]).toBe(CHANNELS.noticeRaised);
        expect(noticePushSchema.parse(pushed()[0])).toMatchObject({
            code: 'files-unreadable',
            tone: 'warning',
            key: 'files-unreadable:local',
            params: { count: 1, names: ['Login'] },
        });
        expect(JSON.stringify(pushed())).not.toContain('home');
        expect(JSON.stringify(pushed())).not.toContain('x9k2m4p7q1w3');
    });

    it('says nothing when everything was read', () => {
        reportUnreadable(createNoticeOutbox(window), logger, []);

        expect(window.sent).toEqual([]);
        expect(logged).toEqual([]);
    });

    it('does not tell twice the file it already told, however often the lateral reloads', () => {
        const outbox = createNoticeOutbox(window);
        const login = broken('login.yaml', 'Login');

        reportUnreadable(outbox, logger, [login]);
        reportUnreadable(outbox, logger, [login]);
        reportUnreadable(outbox, logger, []);

        expect(window.sent).toHaveLength(1);
        expect(logged).toHaveLength(1);
    });

    it('counts every file told so far when another one breaks', () => {
        const outbox = createNoticeOutbox(window);

        reportUnreadable(outbox, logger, [broken('a.yaml', 'Login')]);
        reportUnreadable(outbox, logger, [broken('b.yaml', 'Staging')]);

        expect(pushed().at(-1)).toMatchObject({
            params: { count: 2, names: ['Login', 'Staging'] },
        });
    });

    it('tells again after the origin is opened again', () => {
        const outbox = createNoticeOutbox(window);
        const login = broken('login.yaml', 'Login');

        reportUnreadable(outbox, logger, [login]);
        forgetUnreadable(outbox);
        reportUnreadable(outbox, logger, [login]);

        expect(window.sent).toHaveLength(2);
    });

    it('names a few and counts the rest', () => {
        const outbox = createNoticeOutbox(window);
        const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((name) =>
            broken(`${name}.yaml`, name.toUpperCase()),
        );

        reportUnreadable(outbox, logger, many);

        expect(pushed()[0]).toMatchObject({
            params: { count: 7, names: ['A', 'B', 'C', 'D', 'E', '…'] },
        });
    });

    it('only counts the files when none of them carries a name', () => {
        const outbox = createNoticeOutbox(window);

        reportUnreadable(outbox, logger, [broken('a.yaml'), broken('b.yaml')]);

        expect(noticePushSchema.parse(pushed()[0])).toMatchObject({
            code: 'files-unreadable-unnamed',
            params: { count: 2, names: [] },
        });
    });

    it('marks with an ellipsis that some of the files listed carry no name', () => {
        const outbox = createNoticeOutbox(window);

        reportUnreadable(outbox, logger, [broken('a.yaml', 'Login'), broken('b.yaml')]);

        expect(pushed()[0]).toMatchObject({
            code: 'files-unreadable',
            params: { count: 2, names: ['Login', '…'] },
        });
    });

    it('turns to the named code once a file that carries a name breaks too', () => {
        const outbox = createNoticeOutbox(window);

        reportUnreadable(outbox, logger, [broken('a.yaml')]);
        reportUnreadable(outbox, logger, [broken('b.yaml', 'Login')]);

        expect(pushed().map((message) => (message as { code: string }).code)).toEqual([
            'files-unreadable-unnamed',
            'files-unreadable',
        ]);
    });
});
