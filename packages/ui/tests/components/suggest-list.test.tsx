import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Popover, SuggestList } from '../../src/index.js';

describe('the list of variable suggestions', () => {
    it('renders a named listbox with one option per variable', async () => {
        render(
            <Popover open>
                <SuggestList
                    activeName="host"
                    label="Variables del entorno"
                    onPick={vi.fn()}
                    options={[
                        { name: 'device_key', hint: 'x-device-type' },
                        { name: 'deviceType', hint: '2' },
                    ]}
                />
            </Popover>,
        );

        const listbox = await screen.findByRole('listbox', { name: 'Variables del entorno' });
        const options = screen.getAllByRole('option');

        expect(listbox).toBeVisible();
        expect(options).toHaveLength(2);
        expect(options[0]).toHaveTextContent('device_key');
        expect(options[0]).toHaveTextContent('x-device-type');
        expect(options[1]).toHaveTextContent('deviceType');
    });

    it('marks the active option, and only it', async () => {
        render(
            <Popover open>
                <SuggestList
                    activeName="port"
                    label="Variables"
                    onPick={vi.fn()}
                    options={[{ name: 'host' }, { name: 'port', hint: '8080' }]}
                />
            </Popover>,
        );

        await screen.findByRole('listbox');

        expect(screen.getByRole('option', { name: 'host' }).getAttribute('aria-selected')).toBe(
            'false',
        );
        expect(screen.getByRole('option', { name: /^port/ }).getAttribute('aria-selected')).toBe(
            'true',
        );
    });

    it('hands the picked name back without taking the focus off the field', async () => {
        const onPick = vi.fn();
        const onHighlight = vi.fn();

        render(
            <Popover open>
                <SuggestList
                    activeName={null}
                    label="Variables"
                    onHighlight={onHighlight}
                    onPick={onPick}
                    options={[{ name: 'host' }, { name: 'port' }]}
                />
            </Popover>,
        );

        const options = await screen.findAllByRole('option');
        const second = options[1];

        if (second === undefined) {
            throw new Error('the list lost an option');
        }

        fireEvent.pointerMove(second);
        fireEvent.click(second);

        expect(onHighlight).toHaveBeenCalledWith('port');
        expect(onPick).toHaveBeenCalledWith('port');
    });
});
