import { Select } from '@mandor/ui';
import { useState } from 'react';

const METODOS = [
    { label: 'GET', value: 'get' },
    { label: 'POST', value: 'post' },
    { label: 'PUT', value: 'put' },
    { label: 'DELETE', value: 'delete' },
];

/** Abre, elige y mira el gatillo: la línea elegida va en peso, sin glifo que la marque. */
export function BasicoDemo() {
    const [metodo, setMetodo] = useState('get');

    return (
        <div className="flex items-center gap-gap-group">
            <Select
                label="Método"
                onValueChange={setMetodo}
                options={METODOS}
                value={metodo}
                className="w-40"
            />
            <span className="font-mono text-xs text-text-secondary">
                value=&#123;'{metodo}'&#125;
            </span>
        </div>
    );
}
