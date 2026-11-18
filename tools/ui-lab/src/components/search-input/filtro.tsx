import { Popover, SearchInput, SuggestList } from '@mandor/ui';
import { useRef, useState } from 'react';

const WORKSPACES = ['Gateway local', 'Gateway de staging', 'Pagos', 'Cuentas', 'Notificaciones'];

/** Su caso único: estrechar una lista. La lista flota bajo el campo y solo existe mientras hay coincidencias. */
export function FiltroDemo() {
    const [filtro, setFiltro] = useState('');
    const [abierta, setAbierta] = useState(false);
    const ancla = useRef<HTMLDivElement | null>(null);

    const visibles = WORKSPACES.filter((nombre) =>
        nombre.toLowerCase().includes(filtro.toLowerCase()),
    );

    function escribe(siguiente: string): void {
        setFiltro(siguiente);
        setAbierta(siguiente.length > 0);
    }

    return (
        <div className="w-72">
            <Popover anchor={ancla} modal={false} onOpenChange={setAbierta} open={abierta}>
                <div ref={ancla}>
                    <SearchInput
                        label="Filtrar workspaces"
                        onValueChange={escribe}
                        placeholder="Filtrar…"
                        value={filtro}
                    />
                </div>
                {visibles.length === 0 ? null : (
                    <SuggestList
                        activeName={null}
                        label="Workspaces que coinciden"
                        onPick={(nombre) => {
                            escribe(nombre);
                            setAbierta(false);
                        }}
                        options={visibles.map((nombre) => ({ name: nombre }))}
                    />
                )}
            </Popover>
        </div>
    );
}
