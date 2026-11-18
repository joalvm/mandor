import { Checkbox } from '@mandor/ui';
import { useState } from 'react';

const CABECERAS = ['Authorization', 'X-Request-Id', 'X-Trace'];

type Marcadas = Record<string, boolean>;

const TODAS_MARCADAS: Marcadas = {
    Authorization: true,
    'X-Request-Id': true,
    'X-Trace': true,
};

function estadoDe(marcadas: Marcadas): boolean | 'indeterminate' {
    const dentro = CABECERAS.filter((cabecera) => marcadas[cabecera]).length;

    if (dentro === 0) {
        return false;
    }

    return dentro === CABECERAS.length ? true : 'indeterminate';
}

/**
 * El caso que justifica el mixed: un padre que resume a sus hijos. Tocar el padre los marca
 * todos; tocar uno deja al padre en mixed mientras sigan discrepando.
 */
export function ListaDemo() {
    const [marcadas, setMarcadas] = useState<Marcadas>(TODAS_MARCADAS);

    function marcaTodas(checked: boolean): void {
        setMarcadas(Object.fromEntries(CABECERAS.map((cabecera) => [cabecera, checked])));
    }

    return (
        <div className="flex flex-col gap-gap-control">
            <Checkbox
                checked={estadoDe(marcadas)}
                label="Todas las cabeceras"
                onCheckedChange={marcaTodas}
            />
            {CABECERAS.map((cabecera) => (
                <div className="flex items-center gap-gap-control pl-pad-panel" key={cabecera}>
                    <Checkbox
                        checked={marcadas[cabecera] ?? false}
                        label={cabecera}
                        onCheckedChange={(checked) => {
                            setMarcadas({ ...marcadas, [cabecera]: checked });
                        }}
                    />
                    <span className="font-mono text-xs text-text-secondary">{cabecera}</span>
                </div>
            ))}
        </div>
    );
}
