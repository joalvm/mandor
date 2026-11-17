import { Checkbox, FieldWiringProvider } from '@mandor/ui';
import { useState, type ReactNode } from 'react';

function celda(marca: string, control: ReactNode): ReactNode {
    return (
        <div className="flex flex-col items-center gap-gap-tight">
            {control}
            <span className="font-mono text-2xs text-text-secondary">{marca}</span>
        </div>
    );
}

/** Los seis estados que el checkbox sabe dibujar: tres vivos, dos apagados y uno inválido. */
export function EstadosDemo() {
    const [dentro, setDentro] = useState(true);

    return (
        <div className="grid grid-cols-3 gap-gap-group">
            {celda(
                'false',
                <Checkbox checked={false} label="Fuera" onCheckedChange={() => undefined} />,
            )}
            {celda(
                'true',
                <Checkbox checked={dentro} label="Dentro" onCheckedChange={setDentro} />,
            )}
            {celda(
                "'indeterminate'",
                <Checkbox
                    checked="indeterminate"
                    label="Mixed"
                    onCheckedChange={() => undefined}
                />,
            )}
            {celda(
                'disabled',
                <Checkbox
                    checked={false}
                    disabled
                    label="Apagado"
                    onCheckedChange={() => undefined}
                />,
            )}
            {celda(
                'disabled + true',
                <Checkbox checked disabled label="Fijo" onCheckedChange={() => undefined} />,
            )}
            {celda(
                'aria-invalid: true',
                <FieldWiringProvider
                    value={{ describedBy: undefined, id: 'invalida', invalid: true }}
                >
                    <Checkbox checked={false} label="Inválida" onCheckedChange={() => undefined} />
                </FieldWiringProvider>,
            )}
        </div>
    );
}
