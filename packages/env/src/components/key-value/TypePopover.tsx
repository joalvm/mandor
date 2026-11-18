import { useMessages } from '@mandor/i18n';
import { KEY_VALUE_TYPES, type KeyValueMeta } from '@mandor/schema';
import { IconButton, Popover, PopoverPanel, PopoverTrigger, Select, Switch } from '@mandor/ui';
import type { ReactElement, ReactNode } from 'react';

import { TypedMetaFields } from './TypedMetaFields.js';

type TypePopoverProps = {
    children: ReactElement;
    meta: KeyValueMeta | undefined;
    onMetaChange: (meta: KeyValueMeta | undefined) => void;
};

type TypeMetaProps = Pick<TypePopoverProps, 'meta' | 'onMetaChange'>;

/**
 * What a pair promises about its type, said next to the row. The panel grows with the
 * choice: the fields a type carries — default, enum, and the bounds of the numeric ones —
 * exist only once a type is picked, and leave with it when the type is cleared.
 */
export function TypePopover({ children, meta, onMetaChange }: TypePopoverProps): ReactNode {
    const messages = useMessages('environment');

    return (
        <Popover>
            <PopoverTrigger>{children}</PopoverTrigger>
            <PopoverPanel label={messages('keyValueTypeTitle')}>
                <div
                    className="flex w-72 flex-col gap-gap-control p-pad-inline-panel"
                    data-part="key-value-type"
                >
                    <div className="flex items-center gap-gap-tight">
                        <Select
                            className="min-w-0 flex-1"
                            label={messages('keyValueType')}
                            onValueChange={(type) => {
                                onMetaChange({ ...meta, type });
                            }}
                            options={KEY_VALUE_TYPES.map((type) => ({ label: type, value: type }))}
                            placeholder={messages('keyValueTypePlaceholder')}
                            value={meta?.type}
                        />
                        <TypeClear meta={meta} onMetaChange={onMetaChange} />
                    </div>
                    <div className="flex items-center gap-gap-group">
                        <Switch
                            checked={meta?.required === true}
                            label={messages('keyValueRequired')}
                            onCheckedChange={(required) => {
                                onMetaChange({ ...meta, required });
                            }}
                            withLabel
                        />
                        <Switch
                            checked={meta?.deprecated === true}
                            label={messages('keyValueDeprecated')}
                            onCheckedChange={(deprecated) => {
                                onMetaChange({ ...meta, deprecated });
                            }}
                            withLabel
                        />
                    </div>
                    <TypeDetails meta={meta} onMetaChange={onMetaChange} />
                </div>
            </PopoverPanel>
        </Popover>
    );
}

function TypeClear({ meta, onMetaChange }: TypeMetaProps) {
    const messages = useMessages('environment');

    if (meta?.type === undefined) {
        return null;
    }

    return (
        <IconButton
            icon="close"
            label={messages('keyValueTypeClear')}
            onClick={() => {
                onMetaChange(undefined);
            }}
            size="sm"
        />
    );
}

function TypeDetails({ meta, onMetaChange }: TypeMetaProps) {
    if (meta?.type === undefined) {
        return null;
    }

    return <TypedMetaFields meta={meta} onMetaChange={onMetaChange} />;
}
