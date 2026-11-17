import { dynamicRandomInt } from './dynamic-random-int.js';
import { dynamicTimestamp } from './dynamic-timestamp.js';
import { dynamicUuid } from './dynamic-uuid.js';

/**
 * Computes the dynamic level of the scope: the values of the three built-in variables.
 * The caller invokes it once per resolution and passes the result to `composeScope` as
 * `dynamic`, so two `{{$uuid}}` in the same text resolve to the same value while two
 * resolutions never share one. Eager on purpose: three cheap calls beat the bookkeeping
 * of computing only the names the template mentions.
 */
export function computeDynamicValues(): Record<string, string> {
    return {
        $uuid: dynamicUuid(),
        $timestamp: dynamicTimestamp(),
        $randomInt: dynamicRandomInt(),
    };
}
