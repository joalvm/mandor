/** The one question of a list that the API asks in many places. Needs nothing. */
export const LISTS_GUEST = String.raw`
function listHas(list, item) {
    for (let index = 0; index < list.length; index += 1) {
        if (list[index] === item) {
            return true;
        }
    }

    return false;
}
`;
