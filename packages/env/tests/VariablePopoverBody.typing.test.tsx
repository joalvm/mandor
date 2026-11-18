import { createEnvironment, type Environment } from '@mandor/schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VariablePopoverBody } from '../src/components/field/VariablePopoverBody.js';
import { Wrapper } from './support/variable-field.js';
import { windowScope } from '../src/lib/window-scope.js';

const environment = createEnvironment({
    id: 'local',
    name: 'local',
    variables: [
        { name: 'baseUrl', value: 'http://localhost:81/', enabled: true, secret: false },
        { name: 'token', value: '', enabled: true, secret: true },
    ],
});

function body(shown: Environment, name: string, onVariablesChange = vi.fn()) {
    return (
        <VariablePopoverBody
            environment={shown}
            name={name}
            onSeeAll={() => undefined}
            onVariablesChange={onVariablesChange}
            scope={windowScope(undefined, [], [])}
        />
    );
}

describe('typing in the body of the variable popover', () => {
    /** The token under the popover repaints with what is written, not with what was confirmed. */
    it('hands the value of a declared variable back as it is typed, with no Enter', () => {
        const onVariablesChange = vi.fn();

        render(body(environment, 'baseUrl', onVariablesChange), { wrapper: Wrapper });
        fireEvent.input(screen.getByLabelText('Variable value'), {
            target: { textContent: 'http://localhost:82/' },
        });

        expect(onVariablesChange).toHaveBeenCalledTimes(1);
        expect(onVariablesChange).toHaveBeenCalledWith([
            { name: 'baseUrl', value: 'http://localhost:82/', enabled: true, secret: false },
            { name: 'token', value: '', enabled: true, secret: true },
        ]);
    });

    it('writes nothing when the field only reports its text on being left', () => {
        const onVariablesChange = vi.fn();

        render(body(environment, 'baseUrl', onVariablesChange), { wrapper: Wrapper });
        fireEvent.blur(screen.getByLabelText('Variable value'));

        expect(onVariablesChange).not.toHaveBeenCalled();
    });

    it('shows what is typed while the environment has not read it back yet', () => {
        render(body(environment, 'baseUrl'), { wrapper: Wrapper });
        fireEvent.input(screen.getByLabelText('Variable value'), {
            target: { textContent: 'http://localhost:82/' },
        });

        expect(screen.getByLabelText('Variable value')).toHaveTextContent('http://localhost:82/');
    });

    /** The panel never takes the focus on its own; the user's own Create click earns it. */
    it('takes the focus to the value of the variable it just created, when it appears', () => {
        const created = createEnvironment({
            id: 'local',
            name: 'local',
            variables: [
                ...environment.variables,
                { name: 'nobody', value: '', enabled: true, secret: false },
            ],
        });
        const { rerender } = render(body(environment, 'nobody'), { wrapper: Wrapper });

        fireEvent.click(screen.getByRole('button', { name: 'Create it in local' }));
        rerender(body(created, 'nobody'));

        expect(screen.getByLabelText('Variable value')).toHaveFocus();
    });

    it('leaves the focus where it was for a variable that was declared all along', () => {
        render(body(environment, 'baseUrl'), { wrapper: Wrapper });

        expect(screen.getByLabelText('Variable value')).not.toHaveFocus();
    });
});
