/**
 * One path id segment, excluding traversal, case differences and Windows device names. Letters
 * of any alphabet count, lower case or caseless, with the marks a script is read with; the only
 * separator is the hyphen, never first.
 */
export const SEGMENT =
    /^(?=.{1,255}$)(?!(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$)[\p{Ll}\p{Lm}\p{Lo}\p{Nd}][\p{Ll}\p{Lm}\p{Lo}\p{M}\p{Nd}-]*$/u;
