import { Input, placeCaretAt, Popover, SuggestList } from '@mandor/ui';
import { useRef, useState, type KeyboardEvent, type RefObject } from 'react';

const OPCIONES = [
    { hint: 'https://api.example.com', name: 'baseUrl' },
    { hint: 'secreto', name: 'token' },
    { hint: 'v2', name: 'version' },
] as const;

type Sugerencia = { active: string; open: boolean };

/** Lo que cada tecla hace con la lista abierta; las demás siguen escribiendo en el campo. */
const TECLAS: Record<string, (now: Sugerencia) => Sugerencia> = {
    ArrowDown: (now) => ({ ...now, active: vecino(now.active, 1) }),
    ArrowUp: (now) => ({ ...now, active: vecino(now.active, -1) }),
    Escape: (now) => ({ ...now, open: false }),
};

function vecino(name: string, step: number): string {
    const at = OPCIONES.findIndex((option) => option.name === name);
    const next = (at + step + OPCIONES.length) % OPCIONES.length;

    return OPCIONES[next]?.name ?? name;
}

/**
 * La lista de nombres que un campo sugiere mientras se escribe una variable. Cuelga del campo,
 * nunca le quita el foco: las flechas mueven el resaltado, Enter elige y Escape cierra.
 */
export function VariablesDemo() {
    const anchor = useRef<HTMLDivElement>(null);
    const editable = useRef<HTMLSpanElement>(null);
    const [value, setValue] = useState('{{');
    const [state, setState] = useState<Sugerencia>({ active: 'baseUrl', open: true });

    /** Un campo con el foco no toma su texto de fuera: la elección se escribe en él, como en la app. */
    function pick(name: string) {
        const node = editable.current;
        const next = `{{${name}}}`;

        if (node !== null) {
            node.textContent = next;
            placeCaretAt(node, next.length);
        }

        setValue(next);
        setState({ ...state, open: false });
    }

    function onKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
        if (!state.open) {
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            pick(state.active);

            return;
        }

        const move = TECLAS[event.key];

        if (move !== undefined) {
            event.preventDefault();
            setState(move(state));
        }
    }

    return (
        <div className="w-80" ref={anchor}>
            <Input
                editableRef={editable}
                label="URL"
                onKeyDown={onKeyDown}
                onValueChange={(next) => {
                    setValue(next);
                    setState({ ...state, open: next.endsWith('{{') });
                }}
                value={value}
            />
            <Sugerencias anchor={anchor} onPick={pick} setState={setState} state={state} />
        </div>
    );
}

type SugerenciasProps = {
    anchor: RefObject<HTMLDivElement | null>;
    onPick: (name: string) => void;
    setState: (next: Sugerencia) => void;
    state: Sugerencia;
};

function Sugerencias({ anchor, onPick, setState, state }: SugerenciasProps) {
    if (!state.open) {
        return null;
    }

    return (
        <Popover anchor={anchor} modal={false} open>
            <SuggestList
                activeName={state.active}
                label="Variables"
                onHighlight={(active) => {
                    setState({ ...state, active });
                }}
                onPick={onPick}
                options={OPCIONES}
            />
        </Popover>
    );
}
