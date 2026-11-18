import { originsLeft } from '../origin/origin-scope.js';

/**
 * A turn for reads that replace one another on screen. Each read takes one as it is asked and,
 * once answered, asks whether it is still the last: a read of what the user left behind that
 * answers late is dropped instead of drawn under what they opened since. Leaving the origin ends
 * every turn: a read of the origin left behind would land in the stores the next one fills.
 */
export function createLatestRead(): () => () => boolean {
    let asked = 0;

    return () => {
        asked += 1;

        const turn = asked;
        const origin = originsLeft();

        return () => turn === asked && origin === originsLeft();
    };
}
