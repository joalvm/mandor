import { scaleTokenValues } from '../../styles/token-scale-values.js';

/**
 * How tall a row of a table stands: one control, and the line under it, which adds to the row
 * rather than eating its height (`table.css`). A window over a long table counts every row it
 * left out at this height; counted at a line of the scale, the whole table came out a fifth
 * short, and each row drawn for the first time moved the scroll by what it measured over.
 */
export const TABLE_ROW_HEIGHT = Number.parseFloat(scaleTokenValues['mandor-height-control']) + 1;
