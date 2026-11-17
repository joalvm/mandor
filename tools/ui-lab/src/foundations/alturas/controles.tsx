import { useState } from 'react';

import { Badge, Button, Input, StatusDot } from '@mandor/ui';

/** Controles reales en sus alturas: nada de barras de colores por fuera del producto. */
export function ControlesDemo() {
    const [value, setValue] = useState('mandor-sync.local');

    return (
        <div className="flex flex-col items-start gap-gap-control">
            <Button variant="secondary">h-control — 28 px</Button>
            <Button size="sm" variant="secondary">
                h-control-sm — 24 px
            </Button>
            <Input className="max-w-xs" label="h-field" value={value} onValueChange={setValue} />
            <div className="flex h-row items-center gap-gap-control">
                <StatusDot label="Conectado" state="connected" />
                <span className="text-sm text-text-primary">h-row — 28 px</span>
                <Badge count>3</Badge>
                <span className="text-xs text-text-secondary">h-4 la señal, 16 px</span>
            </div>
        </div>
    );
}
