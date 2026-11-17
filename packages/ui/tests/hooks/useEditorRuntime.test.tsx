// isolation-policy: the editor loads once per window, and this file tests that first load.
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useEditorRuntime } from '../../src/hooks/useEditorRuntime.js';
import { settleEditorRuntime } from '../../src/testing/editors-in.js';

function Harness(): ReactNode {
    return <p>{useEditorRuntime() === null ? 'loading' : 'ready'}</p>;
}

describe('useEditorRuntime', () => {
    /** The window opens without the editor, and the first component that asks for one loads it. */
    it('loads the editor for the component that asks, and draws it again once it is there', async () => {
        render(<Harness />);

        expect(screen.getByText('loading')).toBeInTheDocument();

        await settleEditorRuntime();

        expect(screen.getByText('ready')).toBeInTheDocument();
    });
});
