import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SettingDependents, SettingRow, SettingsGroup, Switch } from '../../../src/index.js';

function inheritance(reset?: () => void) {
    return {
        caption: 'Por defecto:',
        onFollow: vi.fn(),
        place: 'Ajustes',
        reset: reset === undefined ? undefined : { label: 'Restablecer', onReset: reset },
    };
}

describe('the SettingsGroup block', () => {
    it('is announced by the heading it writes', () => {
        render(
            <SettingsGroup title="Redirecciones">
                <SettingRow label="Seguir">
                    <Switch checked label="Seguir" onCheckedChange={() => undefined} />
                </SettingRow>
            </SettingsGroup>,
        );

        expect(screen.getByRole('region', { name: 'Redirecciones' })).toBeVisible();
        expect(screen.getByRole('heading', { name: 'Redirecciones' })).toBeVisible();
    });
});

describe('the SettingRow block', () => {
    it('wires the control inside to its name and its help', () => {
        render(
            <SettingRow help="Sigue la dirección que da la respuesta." label="Seguir">
                <Switch checked label="Seguir" onCheckedChange={() => undefined} />
            </SettingRow>,
        );

        expect(screen.getByRole('switch', { name: 'Seguir' })).toHaveAccessibleDescription(
            'Sigue la dirección que da la respuesta.',
        );
    });

    it('stacks the control under its text when asked to', () => {
        const { container } = render(
            <SettingRow label="Cifrados" stacked>
                <Switch checked label="Cifrados" onCheckedChange={() => undefined} />
            </SettingRow>,
        );

        expect(container.querySelector('[data-part="setting-row"]')).toHaveAttribute(
            'data-stacked',
            'true',
        );
    });
});

describe('the SettingInheritanceLine under a row', () => {
    it('names the place that holds the default, and the name leads there', () => {
        const inherits = inheritance();

        render(
            <SettingRow inherits={inherits} label="Seguir">
                <Switch checked label="Seguir" onCheckedChange={() => undefined} />
            </SettingRow>,
        );

        expect(screen.getByText('Por defecto:')).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }));

        expect(inherits.onFollow).toHaveBeenCalledOnce();
    });

    it('hands the value back once the row keeps its own, and no longer names the place', () => {
        const onReset = vi.fn();

        render(
            <SettingRow inherits={inheritance(onReset)} label="Seguir">
                <Switch checked label="Seguir" onCheckedChange={() => undefined} />
            </SettingRow>,
        );

        expect(screen.queryByRole('button', { name: 'Ajustes' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));

        expect(onReset).toHaveBeenCalledOnce();
    });
});

describe('the SettingDependents block', () => {
    it('holds the rows that hang from the one above it', () => {
        const { container } = render(
            <SettingDependents>
                <SettingRow label="Tope">
                    <Switch checked label="Tope" onCheckedChange={() => undefined} />
                </SettingRow>
            </SettingDependents>,
        );

        const tray = container.querySelector('[data-part="setting-dependents"]');

        expect(tray).toContainElement(screen.getByRole('switch', { name: 'Tope' }));
    });
});
