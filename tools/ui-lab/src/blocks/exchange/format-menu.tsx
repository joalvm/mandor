import { ChevronDownIcon, FileCodeIcon } from '@mandor/icons';
import { Button, Menu, MenuContent, MenuItem, MenuTrigger } from '@mandor/ui';

type Format = { label: string; value: string };

type FormatMenuProps = {
    formats: readonly Format[];
    onChange: (value: string) => void;
    value: string | undefined;
};

/**
 * El formato en que se exporta, como lista desplegable: un botón de ancho fijo que dice el
 * elegido y abre la lista con él en negrita. No es un campo nativo, que el sistema pintaría
 * fuera del tema.
 */
export function FormatMenu({ formats, onChange, value }: FormatMenuProps) {
    const chosen = formats.find((format) => format.value === value);

    return (
        <Menu checkable>
            <MenuTrigger>
                <Button
                    className="h-field w-32 justify-between"
                    data-part="format-menu"
                    size="sm"
                    variant="secondary"
                >
                    <span className="flex min-w-0 items-center gap-gap-icon-text">
                        <FileCodeIcon size="sm" />
                        <span className="truncate">{chosen?.label}</span>
                    </span>
                    <ChevronDownIcon size="sm" />
                </Button>
            </MenuTrigger>
            <MenuContent fitTrigger>
                {formats.map((format) => (
                    <MenuItem
                        checked={format.value === value}
                        key={format.value}
                        onSelect={() => {
                            onChange(format.value);
                        }}
                    >
                        {format.label}
                    </MenuItem>
                ))}
            </MenuContent>
        </Menu>
    );
}
