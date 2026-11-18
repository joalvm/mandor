import { itemResource } from '@mandor/collections';
import { envStore } from '@mandor/env';
import { failure, success, type CodegenSnippet, type Result } from '@mandor/ipc';
import { createRequestItem, type SnippetTarget } from '@mandor/schema';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { useRequestSnippet } from '../../../../src/renderer/features/requests/hooks/useRequestSnippet.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');
const REQUEST = createRequestItem({ name: 'Orders' });

type Props = { open: boolean; target: SnippetTarget };

/** An answer the test lets go when it wants: what a slow main looks like. */
function gate() {
    let release: (result: Result<CodegenSnippet>) => void = () => undefined;
    const answer = new Promise<Result<CodegenSnippet>>((resolve) => {
        release = resolve;
    });

    return { answer, release };
}

function snippetHook(initialProps: Props) {
    return renderHook(
        ({ open, target }: Props) => useRequestSnippet({ open, resource: RESOURCE, target }),
        { initialProps },
    );
}

describe('the request as code, as the dialog asks for it', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        requestsStore.getState().reset();
        envStore.getState().reset();
        requestsStore.getState().setRequest(RESOURCE, REQUEST);
    });

    afterEach(() => {
        cleanup();
        requestsStore.getState().reset();
        envStore.getState().reset();
    });

    it('is nothing while the dialog is closed, and asks nothing', () => {
        const snippet = vi.spyOn(syncBridge.codegen, 'snippet');
        const { result } = snippetHook({ open: false, target: 'curl' });

        expect(result.current).toBeNull();
        expect(snippet).not.toHaveBeenCalled();
    });

    /** The code says what the request set; what the app fills in by default stays out of it. */
    it('is loading until main answers, then the code of the request as it was kept', async () => {
        const slow = gate();
        const snippet = vi.spyOn(syncBridge.codegen, 'snippet').mockReturnValue(slow.answer);

        envStore.setState({ activeEnvironmentIds: { local: 'env-1' } });

        const { result } = snippetHook({ open: true, target: 'js-fetch' });

        expect(result.current).toEqual({ state: 'loading' });

        await act(async () => {
            slow.release(success({ code: 'fetch(x)', leftOutFile: 'a.bin' }));
            await slow.answer;
        });

        expect(result.current).toEqual({ state: 'ready', code: 'fetch(x)', leftOutFile: 'a.bin' });
        expect(snippet).toHaveBeenCalledWith({
            environmentId: 'env-1',
            itemPath: 'crear-pedido',
            request: REQUEST,
            target: 'js-fetch',
            workspaceId: 'local',
        });
    });

    it('asks again for the language the dialog switches to, and drops the late answer of the old one', async () => {
        const first = gate();
        const second = gate();
        const snippet = vi
            .spyOn(syncBridge.codegen, 'snippet')
            .mockReturnValueOnce(first.answer)
            .mockReturnValueOnce(second.answer);

        const { rerender, result } = snippetHook({ open: true, target: 'curl' });

        rerender({ open: true, target: 'php-curl' });

        expect(result.current).toEqual({ state: 'loading' });

        await act(async () => {
            second.release(success({ code: 'php', leftOutFile: null }));
            await second.answer;
        });
        await act(async () => {
            first.release(success({ code: 'curl', leftOutFile: null }));
            await first.answer;
        });

        expect(snippet).toHaveBeenCalledTimes(2);
        expect(result.current).toEqual({ state: 'ready', code: 'php', leftOutFile: null });
    });

    it('drops an answer that comes after the dialog closed, and asks again when it reopens', async () => {
        const late = gate();
        const snippet = vi
            .spyOn(syncBridge.codegen, 'snippet')
            .mockReturnValueOnce(late.answer)
            .mockResolvedValue(success({ code: 'again', leftOutFile: null }));

        const { rerender, result } = snippetHook({ open: true, target: 'curl' });

        rerender({ open: false, target: 'curl' });

        await act(async () => {
            late.release(success({ code: 'late', leftOutFile: null }));
            await late.answer;
        });

        expect(result.current).toBeNull();

        rerender({ open: true, target: 'curl' });

        await waitFor(() => {
            expect(result.current).toEqual({ state: 'ready', code: 'again', leftOutFile: null });
        });
        expect(snippet).toHaveBeenCalledTimes(2);
    });

    it('waits for its own answer when the dialog opens again, not the code of the last time', async () => {
        const second = gate();

        vi.spyOn(syncBridge.codegen, 'snippet')
            .mockResolvedValueOnce(success({ code: 'first', leftOutFile: null }))
            .mockReturnValueOnce(second.answer);

        const { rerender, result } = snippetHook({ open: true, target: 'curl' });

        await waitFor(() => {
            expect(result.current).toEqual({ state: 'ready', code: 'first', leftOutFile: null });
        });

        rerender({ open: false, target: 'curl' });
        rerender({ open: true, target: 'curl' });

        expect(result.current).toEqual({ state: 'loading' });
    });

    it('keeps the code of the refusal when main refuses', async () => {
        vi.spyOn(syncBridge.codegen, 'snippet').mockResolvedValue(
            failure('snippet-failed', 'boom'),
        );

        const { result } = snippetHook({ open: true, target: 'curl' });

        await waitFor(() => {
            expect(result.current).toEqual({ state: 'failed', error: 'snippet-failed' });
        });
    });

    it('takes an answer out of contract for an unknown failure', async () => {
        vi.spyOn(syncBridge.codegen, 'snippet').mockRejectedValue(new Error('not a result'));

        const { result } = snippetHook({ open: true, target: 'curl' });

        await waitFor(() => {
            expect(result.current).toEqual({ state: 'failed', error: 'unknown' });
        });
    });

    it('fails without asking when the request is not loaded', async () => {
        const snippet = vi.spyOn(syncBridge.codegen, 'snippet');

        requestsStore.getState().reset();

        const { result } = snippetHook({ open: true, target: 'curl' });

        await waitFor(() => {
            expect(result.current).toEqual({ state: 'failed', error: 'unknown' });
        });
        expect(snippet).not.toHaveBeenCalled();
    });
});
