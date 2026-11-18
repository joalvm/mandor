import { Checkbox } from '@mandor/ui';
import { useState } from 'react';

/** Los dos pesos, los números en columna y las mayúsculas, tal como se usan. */
export function FormasDemo() {
    const [checked, setChecked] = useState(true);

    return (
        <div className="flex flex-col gap-gap-group">
            <div className="flex flex-col gap-1">
                <p className="text-md text-text-primary">
                    Regular 400: el peso de todo lo que se lee.
                </p>
                <p className="text-md font-semibold text-text-primary">
                    Semibold 600: el peso de lo que nombra — títulos, cabeceras, verbos.
                </p>
            </div>
            <div className="flex flex-col gap-1">
                <p className="text-xs text-text-secondary">
                    Números tabulares: la cifra en columna se lee en columna, no baila.
                </p>
                <div className="flex flex-col font-mono text-code">
                    {['0123456789', '0123456789', '0123456789'].map((row, index) => (
                        <span
                            className="tabular text-text-primary"
                            key={`${row}-${index.toString()}`}
                        >
                            {row} {index + 1} · {(index + 1) * 1024}
                        </span>
                    ))}
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <p className="text-xs text-text-secondary">
                    Mayúsculas: solo el microtexto de sección, siempre en 2xs.
                </p>
                <p className="text-2xs uppercase text-text-secondary">Fundamentos · sección</p>
            </div>
            <div className="flex items-center gap-gap-control">
                <Checkbox
                    checked={checked}
                    label="Mostrar la escala"
                    onCheckedChange={setChecked}
                />
                <span className="text-sm text-text-secondary">un control real, a 13 px</span>
            </div>
        </div>
    );
}
