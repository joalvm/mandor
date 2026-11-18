import { describe, expect, it } from 'vitest';

import {
    denyUnusedPermissions,
    type PermissionTarget,
} from '../../src/window/renderer-permissions.js';

type Handlers = {
    request: Parameters<PermissionTarget['setPermissionRequestHandler']>[0];
    check: Parameters<PermissionTarget['setPermissionCheckHandler']>[0];
};

function fakeSession(): PermissionTarget & { handlers: Handlers } {
    const handlers: Handlers = { request: null, check: null };

    return {
        handlers,
        setPermissionRequestHandler: (handler) => {
            handlers.request = handler;
        },
        setPermissionCheckHandler: (handler) => {
            handlers.check = handler;
        },
    };
}

function asked(session: ReturnType<typeof fakeSession>, permission: string): boolean[] {
    const answers: boolean[] = [];

    session.handlers.request?.({}, permission, (granted) => {
        answers.push(granted);
    });

    return answers;
}

describe('the permissions of the window', () => {
    it('grants copying to the clipboard, asked or checked', () => {
        const session = fakeSession();

        denyUnusedPermissions(session);

        expect(asked(session, 'clipboard-sanitized-write')).toEqual([true]);
        expect(session.handlers.check?.({}, 'clipboard-sanitized-write')).toBe(true);
    });

    it('refuses what the app never uses, asked or checked', () => {
        const session = fakeSession();

        denyUnusedPermissions(session);

        for (const permission of ['media', 'geolocation', 'notifications', 'clipboard-read']) {
            expect(asked(session, permission)).toEqual([false]);
            expect(session.handlers.check?.({}, permission)).toBe(false);
        }
    });

    it('hands the decision back to Electron when released', () => {
        const session = fakeSession();

        denyUnusedPermissions(session)();

        expect(session.handlers).toEqual({ request: null, check: null });
    });
});
