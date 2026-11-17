import { createHash } from 'node:crypto';

import type { ScriptLevel } from '@mandor/schema';
import type { ScriptRunInput } from '@mandor/script';

/** What an approval is about: the text, and every place it was approved for. */
export type ApprovalSubject = {
    origin: string;
    workspaceId: string;
    level: ScriptLevel;
    event: ScriptRunInput['event'];
    source: string;
};

const SEPARATOR = '\0';

function checked(name: string, value: string): string {
    if (value.includes(SEPARATOR)) {
        throw new Error(`The ${name} of an approval cannot hold the separator`);
    }

    return value;
}

/**
 * The hash that stands for a script approved on this machine. The fields before the text cannot
 * hold the separator, and the text goes last, so no two subjects write the same bytes: moving a
 * script to another workspace, level or event is a script nobody approved.
 */
export function approvalKey(subject: ApprovalSubject): string {
    const { origin, workspaceId, level, event, source } = subject;
    const text = [
        checked('origin', origin),
        checked('workspace', workspaceId),
        level,
        event,
        source,
    ];

    return createHash('sha256').update(text.join(SEPARATOR)).digest('hex');
}
