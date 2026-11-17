import { MessagesProvider } from '@mandor/i18n';
import { createEnvironment, type Environment } from '@mandor/schema';
import { type EditorVariables, TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useEditorVariables } from '../src/hooks/useEditorVariables.js';

afterEach(cleanup);

const LOCAL = createEnvironment({ id: 'local', name: 'Local' });

type Sink = { current: EditorVariables | null };

function Host({
    environment,
    onVariablesChange,
    sink,
}: {
    environment: Environment | undefined;
    onVariablesChange: () => void;
    sink: Sink;
}) {
    const view = useEditorVariables({ environment, onVariablesChange });

    sink.current = view.editor;

    return <>{view.popover}</>;
}

function draw(environment: Environment | undefined, onVariablesChange = vi.fn()): Sink {
    const sink: Sink = { current: null };

    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <Host environment={environment} onVariablesChange={onVariablesChange} sink={sink} />
            </TooltipProvider>
        </MessagesProvider>,
    );

    return sink;
}

function hover(sink: Sink, name: string): void {
    act(() => {
        sink.current?.onHover?.({ name, rect: new DOMRect(4, 8, 60, 16) });
    });
}

describe('the variables an editor reads', () => {
    it('tint what the environment says of the names the text holds', () => {
        const sink = draw(LOCAL);

        expect(sink.current?.variablesOf('{{email}}')).toEqual([
            { from: 0, to: 9, name: 'email', tone: 'missing' },
        ]);
    });

    it('open the popover of the name the pointer is on, and none before', () => {
        const sink = draw(LOCAL);

        expect(screen.queryByRole('dialog')).toBeNull();

        hover(sink, 'email');

        expect(screen.getByRole('dialog', { name: '{{email}}' })).toBeInTheDocument();
    });

    it('hand the declaration of a missing name to the owner of the environment', () => {
        const onVariablesChange = vi.fn();
        const sink = draw(LOCAL, onVariablesChange);

        hover(sink, 'email');
        fireEvent.click(screen.getByRole('button', { name: 'Create it in Local' }));

        expect(onVariablesChange).toHaveBeenCalledWith([
            { enabled: true, name: 'email', secret: false, value: '' },
        ]);
    });

    it('stay the same object while nothing they read changes', () => {
        const sink = draw(LOCAL);
        const first = sink.current;

        hover(sink, 'email');

        expect(sink.current).toBe(first);
    });
});
