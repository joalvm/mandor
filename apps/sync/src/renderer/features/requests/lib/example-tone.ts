import { statusFamilyOf, type StatusFamily } from '../../../response/lib/format-response.js';
import { STATUS_TINT, STATUS_TONE } from '../../../response/lib/status-tone.js';

const NO_CODE_TONE = 'text-text-tertiary';
const NO_CODE_TINT = 'bg-surface-control';

/** The family of a code that is a number a status can be; `default`, a range or nothing have none. */
function familyOf(code: string | undefined): StatusFamily | null {
    const status = Number(code);

    if (code === undefined || !Number.isInteger(status) || status < 100 || status > 599) {
        return null;
    }

    return statusFamilyOf(status);
}

/**
 * The colour the code of an example is drawn in. A code that is not a number a status can be
 * (`default`, a range, nothing) takes no tone: it says nothing about how an exchange ended.
 */
export function exampleTone(code: string | undefined): string {
    const family = familyOf(code);

    return family === null ? NO_CODE_TONE : STATUS_TONE[family];
}

/** The ground of the pill that carries the code, in the tint of the same family. */
export function exampleTint(code: string | undefined): string {
    const family = familyOf(code);

    return family === null ? NO_CODE_TINT : STATUS_TINT[family];
}
