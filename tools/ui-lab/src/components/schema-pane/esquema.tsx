import { SchemaPane } from '@mandor/ui';
import { useState } from 'react';

const ETIQUETAS = {
    editor: 'Esquema del evento',
    generate: 'Generar desde la carga',
};

const INICIO = '{\n    "type": "object",\n    "required": ["id", "en"]\n}';

/**
 * La generación es del montador: el panel solo pregunta arriba. La de esta demo escribe un
 * esquema mínimo con las claves de primer nivel del objeto escrito.
 */
function generar(texto: string): string {
    try {
        const valor = JSON.parse(texto) as Record<string, unknown>;
        const propiedades = Object.fromEntries(
            Object.keys(valor).map((clave) => [clave, { type: 'string' }]),
        );

        return JSON.stringify({ properties: propiedades, type: 'object' }, null, 4);
    } catch {
        return texto;
    }
}

/** El panel de esquema: la tira de acciones arriba y el editor debajo, del idioma del documento. */
export function Esquema() {
    const [texto, setTexto] = useState(INICIO);

    return (
        <div className="flex h-52 flex-col overflow-hidden rounded-md">
            <SchemaPane
                editor={{
                    key: 'lab-esquema',
                    language: 'jsonc',
                    onValueChange: setTexto,
                    value: texto,
                }}
                labels={ETIQUETAS}
                onGenerate={() => {
                    setTexto(generar(texto));
                }}
                options={{}}
            />
        </div>
    );
}
