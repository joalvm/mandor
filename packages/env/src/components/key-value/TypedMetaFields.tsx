import { useMessages } from '@mandor/i18n';
import type { KeyValueMeta } from '@mandor/schema';
import { Field, Input, Switch } from '@mandor/ui';
import { useId, type ReactNode } from 'react';

/** The fields a chosen type carries; the numeric ones also carry their bounds. */
type TypedMetaFieldsProps = {
    meta: KeyValueMeta;
    onMetaChange: (meta: KeyValueMeta) => void;
};

export function TypedMetaFields({ meta, onMetaChange }: TypedMetaFieldsProps): ReactNode {
    const messages = useMessages('environment');
    const id = useId();

    return (
        <>
            <Field help={undefined} id={id} label={messages('keyValueDefault')}>
                <Input
                    label={messages('keyValueDefault')}
                    onValueChange={(next) => {
                        onMetaChange({ ...meta, default: next });
                    }}
                    placeholder={messages('keyValueDefault')}
                    value={meta.default ?? ''}
                />
            </Field>
            <div className="flex flex-col gap-gap-tight">
                <Switch
                    checked={meta.enumValues !== undefined}
                    label={messages('keyValueEnum')}
                    onCheckedChange={(restricted) => {
                        onMetaChange({ ...meta, enumValues: restricted ? '' : undefined });
                    }}
                    withLabel
                />
                <EnumValuesField id={id} meta={meta} onMetaChange={onMetaChange} />
            </div>
            <BoundsFields id={id} meta={meta} onMetaChange={onMetaChange} />
        </>
    );
}

type MetaFieldProps = TypedMetaFieldsProps & { id: string };

function EnumValuesField({ id, meta, onMetaChange }: MetaFieldProps) {
    const messages = useMessages('environment');

    if (meta.enumValues === undefined) {
        return null;
    }

    return (
        <Field
            help={messages('keyValueEnumHint')}
            id={`${id}-enum`}
            label={messages('keyValueEnum')}
        >
            <Input
                label={messages('keyValueEnum')}
                onValueChange={(next) => {
                    onMetaChange({ ...meta, enumValues: next });
                }}
                placeholder={messages('keyValueEnum')}
                value={meta.enumValues}
            />
        </Field>
    );
}

function BoundsFields({ id, meta, onMetaChange }: MetaFieldProps) {
    const messages = useMessages('environment');

    if (meta.type !== 'integer' && meta.type !== 'number') {
        return null;
    }

    return (
        <div className="grid grid-cols-2 gap-gap-control">
            <Field help={undefined} id={`${id}-min`} label={messages('keyValueMin')}>
                <Input
                    label={messages('keyValueMin')}
                    onValueChange={(next) => {
                        onMetaChange({ ...meta, min: next });
                    }}
                    placeholder="<=x"
                    value={meta.min ?? ''}
                />
            </Field>
            <Field help={undefined} id={`${id}-max`} label={messages('keyValueMax')}>
                <Input
                    label={messages('keyValueMax')}
                    onValueChange={(next) => {
                        onMetaChange({ ...meta, max: next });
                    }}
                    placeholder=">=x"
                    value={meta.max ?? ''}
                />
            </Field>
        </div>
    );
}
