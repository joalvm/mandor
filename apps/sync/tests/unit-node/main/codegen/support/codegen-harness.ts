import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    closeRepo,
    forgetSecrets,
    openRepo,
    redactingIpc,
    spyIpc,
    type IpcSpy,
} from '@mandor/host/testing';
import { CHANNELS, type RequestSendRequest, type Result } from '@mandor/ipc';
import { createEnvironment, createRequestItem, type SnippetTarget } from '@mandor/schema';
import { createWorkspace, writeRepoTree, writeEnvironment } from '@mandor/store-fs';
import { afterEach, beforeEach } from 'vitest';

import { registerCodegenHandlers } from '../../../../../src/main/codegen/codegen.handlers.js';

/** The value of the secret `token`, with a space, a `/` and a `?` to see how it is encoded. */
export const SECRET = 'tok en/42?';

/** The three spellings a url can carry the secret in, the one written as it is included. */
export const SPELLINGS = [SECRET, 'tok%20en%2F42%3F', 'tok+en%2F42%3F'];

export type CodegenHarness = { root: () => string; ipc: () => IpcSpy; dispose: () => void };

/** A repo with the workspace `payments` and the handlers of codegen registered over it. */
export function useCodegenHarness(): CodegenHarness {
    let root = '';
    let ipc: IpcSpy = spyIpc();
    let dispose = (): void => undefined;

    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), 'mandor-codegen-handlers-'));
        await writeRepoTree(root, 'Demo');
        await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'sync' });
        await writeEnvironment(
            root,
            'payments',
            createEnvironment({
                id: 'local',
                name: 'Local',
                variables: [
                    { name: 'baseUrl', value: 'http://api.test', enabled: true, secret: false },
                    { name: 'token', value: '', enabled: true, secret: true },
                ],
            }),
        );
        openRepo(root);
        ipc = spyIpc();
        dispose = registerCodegenHandlers(redactingIpc(ipc), {
            readSecret: () => Promise.resolve(SECRET),
        });
    });

    afterEach(async () => {
        dispose();
        closeRepo();
        forgetSecrets();
        await rm(root, { recursive: true, force: true });
    });

    return {
        root: () => root,
        ipc: () => ipc,
        dispose: () => {
            dispose();
        },
    };
}

export function line(key: string, value: string) {
    return { key, value, enabled: true };
}

export type RequestParts = Partial<RequestSendRequest['request']>;

export function payload(request: RequestParts, target: SnippetTarget = 'curl') {
    return {
        workspaceId: 'payments',
        itemPath: 'orders/list',
        environmentId: 'local',
        request: { ...createRequestItem({ name: 'Orders' }), ...request },
        target,
    };
}

/** The snippet of a request, or an error that carries the refusal if there was one. */
export async function codeOf(ipc: IpcSpy, request: RequestParts, target: SnippetTarget) {
    const answer = (await ipc.call(CHANNELS.codegenSnippet, payload(request, target))) as Result<{
        code: string;
        leftOutFile: string | null;
    }>;

    if (!answer.ok) {
        throw new Error(JSON.stringify(answer));
    }

    return answer.value;
}
