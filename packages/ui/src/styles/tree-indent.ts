import { scaleTokenValues } from './token-scale-values.js';

/**
 * How far one level of a tree steps in, as a number. The scale is where the measure lives and
 * the stylesheet is what draws it; a gesture that has to line up with the drawing needs the
 * same number as arithmetic, and reading it from here is what keeps them one measure.
 */
export const TREE_INDENT = Number.parseFloat(scaleTokenValues['mandor-indent-tree']);
