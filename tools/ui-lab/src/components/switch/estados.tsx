import { Switch } from '@mandor/ui';
import { useState } from 'react';

/** Apagado, encendido y sus dos apagados: el estado vive en el relleno de la píldora. */
export function EstadosDemo() {
    const [primero, setPrimero] = useState(false);
    const [segundo, setSegundo] = useState(true);

    return (
        <div className="grid grid-cols-4 gap-gap-group">
            <div className="flex flex-col items-center gap-gap-tight">
                <Switch checked={primero} label="Apagado" onCheckedChange={setPrimero} />
                <span className="font-mono text-2xs text-text-secondary">false</span>
            </div>
            <div className="flex flex-col items-center gap-gap-tight">
                <Switch checked={segundo} label="Encendido" onCheckedChange={setSegundo} />
                <span className="font-mono text-2xs text-text-secondary">true</span>
            </div>
            <div className="flex flex-col items-center gap-gap-tight">
                <Switch
                    checked={false}
                    disabled
                    label="Apagado fijo"
                    onCheckedChange={() => undefined}
                />
                <span className="font-mono text-2xs text-text-secondary">disabled</span>
            </div>
            <div className="flex flex-col items-center gap-gap-tight">
                <Switch checked disabled label="Encendido fijo" onCheckedChange={() => undefined} />
                <span className="font-mono text-2xs text-text-secondary">disabled</span>
            </div>
        </div>
    );
}
