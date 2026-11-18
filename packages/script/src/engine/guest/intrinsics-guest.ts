/**
 * The first lines the guest runs, before any line of the script: they keep the intrinsics the API
 * of the script uses, so a script that replaces `JSON.stringify` or `Array.prototype.push` cannot
 * change what the API does with them. `I` is the table; the methods of a prototype are kept
 * already unbound (`I.push(list, item)`), and nothing but this closure can reach it. That is a
 * matter of robustness: what keeps the host safe is main, which trusts nothing the guest says.
 */
export const INTRINSICS_GUEST = String.raw`
const uncurry = Function.prototype.bind.bind(Function.prototype.call);
const I = {
    Error,
    TypeError,
    iterator: Symbol.iterator,
    stringify: JSON.stringify,
    parse: JSON.parse,
    create: Object.create,
    keys: Object.keys,
    isArray: Array.isArray,
    define: Object.defineProperty,
    toObject: Object,
    Promise,
    resolve: Promise.resolve.bind(Promise),
    fromCharCode: String.fromCharCode,
    fromCodePoint: String.fromCodePoint,
    toText: String,
    push: uncurry(Array.prototype.push),
    pop: uncurry(Array.prototype.pop),
    join: uncurry(Array.prototype.join),
    indexOf: uncurry(String.prototype.indexOf),
    slice: uncurry(String.prototype.slice),
    charAt: uncurry(String.prototype.charAt),
    charCodeAt: uncurry(String.prototype.charCodeAt),
    codePointAt: uncurry(String.prototype.codePointAt),
    exec: uncurry(RegExp.prototype.exec),
    hasOwn: uncurry(Object.prototype.hasOwnProperty),
    tag: uncurry(Object.prototype.toString),
    toLower: uncurry(String.prototype.toLowerCase),
    then: uncurry(Promise.prototype.then),
};
`;
