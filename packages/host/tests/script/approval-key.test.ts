import { describe, expect, it } from 'vitest';

import { approvalKey, type ApprovalSubject } from '../../src/script/approval-key.js';

const SUBJECT: ApprovalSubject = {
    origin: 'origin-1',
    workspaceId: 'ws-1',
    level: 'request',
    event: 'onBeforeRequest',
    source: 'console.log(1)',
};

describe('approvalKey', () => {
    it('is a sha256 in hex, the same for the same subject', () => {
        expect(approvalKey(SUBJECT)).toMatch(/^[0-9a-f]{64}$/u);
        expect(approvalKey({ ...SUBJECT })).toBe(approvalKey(SUBJECT));
    });

    it.each([
        ['the origin', { origin: 'origin-2' }],
        ['the workspace', { workspaceId: 'ws-2' }],
        ['the level', { level: 'folder' }],
        ['the event', { event: 'onResponse' }],
        ['the text', { source: 'console.log(2)' }],
    ] satisfies [string, Partial<ApprovalSubject>][])('changes with %s', (_name, change) => {
        expect(approvalKey({ ...SUBJECT, ...change })).not.toBe(approvalKey(SUBJECT));
    });

    it('does not take a character moved from one field to the next for the same subject', () => {
        const left = approvalKey({ ...SUBJECT, origin: 'ab', workspaceId: 'c' });
        const right = approvalKey({ ...SUBJECT, origin: 'a', workspaceId: 'bc' });

        expect(left).not.toBe(right);
    });

    it('takes a text that holds the separator, and keeps it apart from the same text without it', () => {
        const withIt = approvalKey({ ...SUBJECT, source: 'x\0y' });

        expect(withIt).toMatch(/^[0-9a-f]{64}$/u);
        expect(withIt).not.toBe(approvalKey({ ...SUBJECT, source: 'xy' }));
        expect(withIt).not.toBe(approvalKey({ ...SUBJECT, event: 'onResponse', source: 'x\0y' }));
    });

    it.each([['origin'], ['workspaceId']] as const)(
        'refuses a %s that holds the separator, which would move the fields',
        (field) => {
            expect(() => approvalKey({ ...SUBJECT, [field]: 'a\0b' })).toThrow(
                'cannot hold the separator',
            );
        },
    );
});
