import { EnvironmentIcon } from '@mandor/icons';
import type { Environment } from '@mandor/schema';
import { MenuItem } from '@mandor/ui';

type EnvironmentChoicesProps = {
    onChange: (environmentId: string) => void;
    options: readonly Environment[];
    value: string | null;
};

/** The environments of a menu that picks one, the one in force checked: the lines every picker shares. */
export function EnvironmentChoices({ onChange, options, value }: EnvironmentChoicesProps) {
    return options.map((environment) => (
        <MenuItem
            checked={environment.id === value}
            key={environment.id}
            onSelect={() => {
                onChange(environment.id);
            }}
        >
            <EnvironmentIcon />
            {environment.name}
        </MenuItem>
    ));
}
