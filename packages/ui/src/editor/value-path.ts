/**
 * Where inside a value a JSON Pointer lands, written the way code reaches it: `$` for the value
 * itself, a dot before a name, brackets around an index or around a key no dot can carry. A
 * pointer reads like a folder — `/data/expire` — while the place it names is a property, so a
 * list of problems says it as one: `$.data.expire`. The last step stands apart from the way to
 * it, so whoever draws the path can set the name that broke against where it lives.
 */
export type ValuePath = {
    /** The step the pointer ends on, or `$` when it names the value itself. */
    leaf: string;
    /** The steps that lead to the leaf, from `$`; empty when the leaf is the value itself. */
    trail: string;
};

/** The forms a step takes, by what the step is: the first one that fits writes it. */
const STEP_FORMS = [
    { fits: /^(?:0|[1-9]\d*)$/u, write: (step: string) => `[${step}]` },
    { fits: /^[A-Za-z_$][\w$]*$/u, write: (step: string) => `.${step}` },
] as const;

export function valuePathOf(pointer: string): ValuePath {
    if (pointer === '') {
        return { leaf: '$', trail: '' };
    }

    const steps = pointer.slice(1).split('/').map(unescapedStep).map(writtenStep);

    return { leaf: steps.at(-1) ?? '', trail: `$${steps.slice(0, -1).join('')}` };
}

/** A step of a pointer as the key it names: `~1` stands for `/` and `~0` for `~`, in that order. */
function unescapedStep(step: string): string {
    return step.replaceAll('~1', '/').replaceAll('~0', '~');
}

/** A key no dot can carry goes between brackets, quoted the way JSON quotes it. */
function writtenStep(step: string): string {
    const form = STEP_FORMS.find((candidate) => candidate.fits.test(step));

    return form?.write(step) ?? `[${JSON.stringify(step)}]`;
}
