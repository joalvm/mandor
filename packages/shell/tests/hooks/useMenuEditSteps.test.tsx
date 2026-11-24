import { render } from '@testing-library/react';
import { windowBridge } from '@mandor/ipc/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMenuEditSteps } from '../../src/hooks/useMenuEditSteps.js';

const execCommand = vi.fn(() => true);

Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });

function Harness() {
    useMenuEditSteps();

    return <span />;
}

afterEach(() => {
    execCommand.mockClear();
});

describe('useMenuEditSteps', () => {
    it('takes the step the Edit menu of the window asked for', () => {
        render(<Harness />);

        windowBridge().emitEditStep({ step: 'undo' });

        expect(execCommand).toHaveBeenCalledWith('undo');
    });

    /** The window is gone: whatever main says next is for nobody. */
    it('stops listening once the window is taken down', () => {
        const view = render(<Harness />);

        view.unmount();
        windowBridge().emitEditStep({ step: 'redo' });

        expect(execCommand).not.toHaveBeenCalled();
    });
});
