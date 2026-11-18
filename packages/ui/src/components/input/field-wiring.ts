import { createContext, useContext } from 'react';

/** What a `Field` hands the control it wraps: its id, its message and whether it is invalid. */
export type FieldWiring = {
    describedBy: string | undefined;
    id: string | undefined;
    invalid: boolean;
};

/** The wiring a control holds of its own, which wins over the field it stands in. */
export type FieldHanded = {
    describedBy?: string | undefined;
    id?: string | undefined;
    invalid?: boolean | undefined;
};

const FieldWiringContext = createContext<FieldWiring | undefined>(undefined);

export const FieldWiringProvider = FieldWiringContext.Provider;

/**
 * The wiring a control runs with: what the surrounding `Field` asks for, with whatever the
 * control was handed directly winning over it. Outside a `Field` the handed values stand alone.
 */
export function useFieldWiring(handed: FieldHanded): FieldWiring {
    const field = useContext(FieldWiringContext);

    return {
        describedBy: handed.describedBy ?? field?.describedBy,
        id: handed.id ?? field?.id,
        invalid: handed.invalid ?? field?.invalid ?? false,
    };
}
