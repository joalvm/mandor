import { envStore } from '@mandor/env';
import { failure, success, type WsScriptNote } from '@mandor/ipc';
import { bridge, consoleStore, shellStore } from '@mandor/shell';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { allByPart, byPart } from '@mandor/ui/testing';

import { ActivityDetail } from '../../../src/renderer/activity/components/dock/ActivityDetail.js';
import { ConnectionScriptDetail } from '../../../src/renderer/activity/components/dock/ConnectionScriptDetail.js';
import { AppProviders } from '../support/app-providers.js';
import { scriptEntryOf } from '../support/activity-entries.js';

const SET = [{ name: 'ticket', preview: 'abc' }];

function renderDetail(changes: Partial<WsScriptNote>, onNotify = vi.fn()) {
    render(
        <AppProviders onNotify={onNotify}>
            <ConnectionScriptDetail entry={scriptEntryOf(changes)} />
        </AppProviders>,
    );

    return onNotify;
}

function markOf(name: string): HTMLElement | undefined {
    return allByPart('script-mark').find((mark) => mark.getAttribute('data-mark') === name);
}

beforeEach(() => {
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

describe('the detail of what the scripts said', () => {
    it('reads the figures of the moment and nothing it does not have to say', () => {
        renderDetail({ event: 'onConnect', logs: [{ level: 'log', text: 'hi' }] });

        const shown = byPart('activity-detail');

        expect(shown).toHaveAttribute('data-format', 'text');
        expect(shown).toHaveTextContent('On connect · 1 line');
        expect(allByPart('script-mark')).toHaveLength(0);
        expect(allByPart('script-error')).toHaveLength(0);
    });

    it('says the error that ended the run, and where it stopped', () => {
        renderDetail({
            event: 'onMessage',
            error: { message: 'x is not defined', errorName: 'ReferenceError', line: 4 },
        });

        const error = byPart('script-error');

        expect(error).toHaveTextContent('x is not defined');
        expect(error).toHaveTextContent('On messages · line 4');
    });

    it('says the secrets stayed behind when a script moved the destination', () => {
        renderDetail({ secretsOff: 'destination', withheld: ['token', 'key'] });

        expect(markOf('destination')).toHaveTextContent(
            'A script changed the destination: it opened without secrets',
        );
        expect(markOf('destination')).toHaveTextContent(
            'Put the host in the environment and the secrets go along.',
        );
        expect(markOf('polling')).toBeUndefined();
        expect(byPart('activity-detail')).toHaveTextContent(
            'Secrets left as their name: token, key',
        );
    });

    it('says a Socket.IO that may poll opened without secrets', () => {
        renderDetail({ secretsOff: 'polling' });

        expect(markOf('polling')).toHaveTextContent(
            'Opened without secrets: polling follows redirects. “WebSocket only” avoids it',
        );
        expect(markOf('destination')).toBeUndefined();
    });

    it('names each run that did not happen, one line apiece', () => {
        renderDetail({
            skipped: [
                { name: 'guard', level: 'connection', event: 'onMessage', bytes: 10 },
                { name: 'other', level: 'collection', event: 'onMessage', bytes: 4 },
            ],
            dropped: 1,
            switchedOff: 3,
        });

        const shown = byPart('activity-detail');

        expect(allByPart('script-mark')).toHaveLength(3);
        expect(shown).toHaveTextContent('Ran without 2 unapproved scripts');
        expect(shown).toHaveTextContent('Dropped: 1. A message no script ran on');
        expect(shown).toHaveTextContent('Scripts are off: 3 did not run');
    });

    it('opens the scripts left out from their mark, to read them before approving', () => {
        renderDetail({
            skipped: [{ name: 'guard', level: 'connection', event: 'onMessage', bytes: 10 }],
        });

        fireEvent.click(screen.getByRole('button', { name: 'Review' }));

        expect(screen.getByRole('dialog', { name: '1 script left out' })).toBeVisible();
        expect(screen.getByRole('option', { name: 'guard' })).toBeVisible();
    });

    it('only tells of the scripts left out when no workspace is open to approve them in', () => {
        shellStore.setState({ activeWorkspaceId: null });
        renderDetail({
            skipped: [{ name: 'guard', level: 'connection', event: 'onMessage', bytes: 10 }],
        });

        expect(markOf('skipped')).toHaveTextContent('Ran without 1 unapproved script');
        expect(screen.queryByRole('button', { name: 'Review' })).toBeNull();
    });

    it('opens the console of the window instead of copying what the scripts wrote', () => {
        renderDetail({ logs: [{ level: 'log', text: 'only in the console' }] });

        expect(byPart('activity-detail')).not.toHaveTextContent('only in the console');
        fireEvent.click(screen.getByRole('button', { name: 'Open console' }));

        expect(consoleStore.getState().open).toBe(true);
    });

    it('forgets what the scripts set in the workspace from the mark of the destination', async () => {
        const clear = vi.spyOn(bridge.scripts, 'clearVariables').mockResolvedValue(success({}));

        envStore.getState().showScriptVariables('events', 'prod', SET);
        renderDetail({ secretsOff: 'destination' });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Forget what scripts set' }));
            await Promise.resolve();
        });

        expect(clear).toHaveBeenCalledWith('events');
        expect(envStore.getState().scriptVariables).toEqual({});
    });

    it('tells why main refused to forget them', async () => {
        vi.spyOn(bridge.scripts, 'clearVariables').mockResolvedValue(failure('not-found', 'none'));
        const onNotify = renderDetail({ secretsOff: 'destination' });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Forget what scripts set' }));
            await Promise.resolve();
        });

        expect(onNotify).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'That is not there anymore, so nothing was written.',
            }),
        );
    });

    it('is the detail the dock reads for a note of the scripts', () => {
        render(
            <AppProviders>
                <ActivityDetail entry={scriptEntryOf()} />
            </AppProviders>,
        );

        expect(byPart('activity-detail')).toHaveTextContent('Before connecting');
    });
});
