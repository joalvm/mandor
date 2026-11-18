import { useState } from 'react';

import { Button, Checkbox, Input, Switch } from '@mandor/ui';

/** Controles reales para recorrer con Tab: el anillo es el borde del control, pintado de acento. */
export function OrdenFocoDemo() {
    const [checked, setChecked] = useState(false);
    const [value, setValue] = useState('8080');
    const [on, setOn] = useState(true);

    return (
        <div className="flex flex-wrap items-center gap-gap-control">
            <Button variant="secondary">Guardar</Button>
            <Button size="sm" variant="secondary">
                Compacto
            </Button>
            <Checkbox checked={checked} label="Recordarme" onCheckedChange={setChecked} />
            <Input className="w-48" label="Puerto" value={value} onValueChange={setValue} />
            <Switch checked={on} label="Keepalive" onCheckedChange={setOn} />
        </div>
    );
}
