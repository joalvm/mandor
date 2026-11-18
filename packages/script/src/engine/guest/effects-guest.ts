/**
 * How the API leaves what it asks for. `putEffect` keeps one effect per thing: a later write of
 * the same kind and name takes the place of the earlier one, where it was. `noticeLine` is how the
 * API says that it did not do what the script asked, without ending the script: a code the window
 * says in its language, never a sentence. Needs `I` and `OUT`.
 */
export const EFFECTS_GUEST = String.raw`
function putEffect(effect) {
    for (let index = 0; index < OUT.effects.length; index += 1) {
        const old = OUT.effects[index];

        if (old.kind === effect.kind && old.name === effect.name) {
            OUT.effects[index] = effect;

            return;
        }
    }

    I.push(OUT.effects, effect);
}

function noticeLine(notice, params) {
    I.push(OUT.logs, params === undefined ? { level: 'warn', notice } : { level: 'warn', notice, params });
}
`;
