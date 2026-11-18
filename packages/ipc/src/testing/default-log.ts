import type { LogArea } from '../log/log-write.js';
import { success } from '../result/success.js';

/** The log area a test gets when it says nothing about the log: every line is taken. */
export function defaultLog(): LogArea {
    return {
        write: () => Promise.resolve(success({})),
    };
}
