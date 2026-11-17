import { useMessages } from '@mandor/i18n';
import { cn, Select } from '@mandor/ui';

import { exampleTint, exampleTone } from '../../lib/example-tone.js';
import { statusLabelOf } from '../../lib/status-label.js';

type ExampleStatusPickerProps = {
    onChange: (status: string) => void;
    value: string;
};

/** The codes an answer is promised with most often, by the family they belong to. */
const FAMILIES = [
    { label: '2xx', codes: ['200', '201', '202', '204'] },
    { label: '3xx', codes: ['301', '302', '304'] },
    { label: '4xx', codes: ['400', '401', '403', '404', '409', '422', '429'] },
    { label: '5xx', codes: ['500', '502', '503', '504'] },
] as const;

/** The answer for whatever status nobody listed. */
const DEFAULT_STATUS = 'default';

const COMMON = new Set<string>([DEFAULT_STATUS, ...FAMILIES.flatMap((family) => family.codes)]);

/**
 * The status the example stands for, as a pill with no border that is as wide as what it says,
 * and the list of the codes that are asked for most, each with its name. A code the document brought that the list does not offer keeps
 * its place at the top, so what the file says is never a lie the picker cannot show.
 */
export function ExampleStatusPicker({ onChange, value }: ExampleStatusPickerProps) {
    const labels = useMessages('requests');
    const unlisted = COMMON.has(value) ? [] : [{ label: value, value }];

    return (
        <Select
            className={cn(
                'h-control-xs rounded-sm border-transparent px-2 text-xs font-semibold',
                'enabled:hover:border-transparent aria-expanded:border-transparent',
                exampleTone(value),
                exampleTint(value),
            )}
            fitChosen
            label={labels('expectedStatus')}
            onValueChange={onChange}
            options={[
                ...unlisted,
                ...FAMILIES.map((family) => ({
                    label: family.label,
                    options: family.codes.map((code) => ({
                        label: statusLabelOf(code),
                        value: code,
                    })),
                })),
                { label: DEFAULT_STATUS, value: DEFAULT_STATUS },
            ]}
            value={value}
        />
    );
}
