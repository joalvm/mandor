type Keyed<Key extends string> = Readonly<Record<Key, string>>;

/**
 * The members of the union that carry the value. A member may carry several (`'json' | 'text'`
 * on one shape), which is why the key is read off the member and not matched as a whole.
 */
type Member<Key extends string, Union extends Keyed<Key>, Value extends Union[Key]> =
    Union extends Keyed<Key> ? (Value extends Union[Key] ? Union : never) : never;

/** One handler per value of the key; each is given the member of the union that carries it. */
export type KeyHandlers<Key extends string, Union extends Keyed<Key>, Result> = {
    [Value in Union[Key]]: (member: Member<Key, Union, Value>) => Result;
};

/**
 * Chooses by the key of a union from a table instead of walking it with branches: a value the
 * table lacks does not compile, and the handler gets its member already narrowed, because the
 * member is typed by the very key that picks the handler.
 */
export function chooseByKey<
    Key extends string,
    Union extends Keyed<Key>,
    Result,
    Value extends Union[Key],
>(table: KeyHandlers<Key, Union, Result>, value: Value, member: Member<Key, Union, Value>): Result {
    return table[value](member);
}
