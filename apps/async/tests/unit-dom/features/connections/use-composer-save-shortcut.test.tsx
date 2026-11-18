import { fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { composerEventsStore } from '../../../../src/renderer/events/composer-events-store.js';
import { useComposerSaveShortcut } from '../../../../src/renderer/features/connections/hooks/useComposerSaveShortcut.js';

const saveEventInComposer = vi.fn(() => Promise.resolve(null));

vi.mock('../../../../src/renderer/events/save-event-in-composer.js', () => ({
    saveEventInComposer: () => saveEventInComposer(),
}));

let dirty = false;

function Harness(): ReactNode {
    const onSave = useComposerSaveShortcut({
        connectionId: 'alpha',
        onError: () => undefined,
    });

    return (
        <div onKeyDown={onSave} role="group">
            {dirty ? 'dirty' : 'clean'}
        </div>
    );
}

function press(key: string, ctrl: boolean): void {
    const { container } = render(<Harness />);
    const panel = container.firstElementChild as HTMLElement;

    fireEvent.keyDown(panel, { ctrlKey: ctrl, key });
}

beforeEach(() => {
    composerEventsStore.getState().reset();
    composerEventsStore.getState().select('alpha', {
        eventName: 'Saludo',
        eventResource: 'mandor://demo/payments/item/message/saludo',
        payload: '',
        payloadType: 'json',
        schema: '',
    });
    composerEventsStore.getState().setPayload('alpha', 'cambiado');
    dirty = composerEventsStore.getState().byConnection['alpha']?.dirty === true;
    saveEventInComposer.mockClear();
});

describe('the composer save shortcut', () => {
    it('saves the dirty event on Control+S', () => {
        press('s', true);

        expect(saveEventInComposer).toHaveBeenCalledTimes(1);
    });

    it('lets every other key through untouched', () => {
        press('k', true);
        press('s', false);

        expect(saveEventInComposer).not.toHaveBeenCalled();
    });
});
