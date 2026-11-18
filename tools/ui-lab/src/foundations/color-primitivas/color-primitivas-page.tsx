import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';

const STEPS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Las rampas crudas, en el orden en que se leen: neutrales, las de marca, las de estado. */
const RAMPS: readonly string[] = [
    'primitive-neutral-light',
    'primitive-neutral-dark',
    'primitive-neutral-a',
    'primitive-teal-light',
    'primitive-teal-dark',
    'primitive-orange-light',
    'primitive-orange-dark',
    'primitive-green-light',
    'primitive-green-dark',
    'primitive-amber-light',
    'primitive-amber-dark',
    'primitive-red-light',
    'primitive-red-dark',
    'primitive-blue-light',
    'primitive-blue-dark',
    'primitive-iris-light',
    'primitive-iris-dark',
    'primitive-pink-light',
    'primitive-pink-dark',
];

function Ramp({ name }: { name: string }) {
    return (
        <li className="flex items-center gap-gap-control">
            <code className="w-56 shrink-0 font-mono text-xs">{`--${name}-*`}</code>
            <div className="flex flex-1 gap-gap-tight">
                {STEPS.map((step) => (
                    <div className="flex-1" key={step}>
                        <div
                            className="h-field rounded-sm border border-border-subtle"
                            style={{ background: `var(--${name}-${step.toString()})` }}
                        />
                        <p className="mt-gap-tight text-center text-2xs text-text-secondary tabular">
                            {step}
                        </p>
                    </div>
                ))}
            </div>
        </li>
    );
}

export function ColorPrimitivasPage() {
    return (
        <DocPage
            lead="La capa que nadie escribe: rampas de Radix con números del 1 al 12, más las
                adicionales de alpha y la de marca. El 9 es el paso del acento sólido; el 3, el de
                los tintes. La rampa de cada tema existe entera: en oscuro se reordenan los pasos
                para conservar el contraste."
            title="Color — primitivas"
        >
            <DocSection
                heading="Las rampas"
                intent="No cambian con el tema: la rampa de claro y la de oscuro existen siempre, y es el token semántico quien elige una."
            >
                <ul className="flex flex-col gap-gap-control">
                    {RAMPS.map((ramp) => (
                        <Ramp key={ramp} name={ramp} />
                    ))}
                </ul>
            </DocSection>

            <DocSection
                heading="Las dos que se salen de la escala"
                intent="La de variables vive en su propio azul; el rojo de intención tiene pasos de hover y de activo fuera de la rampa."
            >
                <ul className="flex flex-col gap-gap-control">
                    <li className="flex items-center gap-gap-control">
                        <code className="w-56 shrink-0 font-mono text-xs">
                            --primitive-variable-*-11
                        </code>
                        <span aria-hidden="true" className="flex w-56 items-center gap-gap-tight">
                            <span
                                className="h-field flex-1 rounded-sm border border-border-subtle"
                                style={{ background: 'var(--primitive-variable-light-11)' }}
                            />
                            <span
                                className="h-field flex-1 rounded-sm border border-border-subtle"
                                style={{ background: 'var(--primitive-variable-dark-11)' }}
                            />
                        </span>
                        <span className="text-xs text-text-secondary">
                            el azul del token de variable dentro de un campo
                        </span>
                    </li>
                    <li className="flex items-center gap-gap-control">
                        <code className="w-56 shrink-0 font-mono text-xs">
                            --primitive-danger-*
                        </code>
                        <span className="flex w-56 items-center gap-gap-tight">
                            <span
                                aria-hidden="true"
                                className="h-field flex-1 rounded-sm border border-border-subtle"
                                style={{ background: 'var(--primitive-danger-hover)' }}
                            />
                            <span
                                aria-hidden="true"
                                className="h-field flex-1 rounded-sm border border-border-subtle"
                                style={{ background: 'var(--primitive-danger-active)' }}
                            />
                        </span>
                        <span className="text-xs text-text-secondary">
                            hover y activo del sólido peligroso
                        </span>
                    </li>
                </ul>
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-text-secondary">
                    <li>
                        Una rampa no se escribe en una plantilla: el nombre semántico manda. La
                        comprobación de contratos rechaza{' '}
                        <code className="font-mono text-xs">bg-teal-9</code>.
                    </li>
                    <li>
                        En la rampa de alpha, los pasos son negros con transparencia: sirven a
                        superficies y sombras de los dos temas.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
