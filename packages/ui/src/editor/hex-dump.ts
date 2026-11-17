const OFFSET_DIGITS = 8;
const HEX = 16;
const FIRST_PRINTABLE = 0x20;
const LAST_PRINTABLE = 0x7e;

/** The widths a dump is read in: the half line, the line every hex editor prints, and the wide one. */
export const HEX_ROW_WIDTHS = [8, 16, 32] as const;

export type HexRowWidth = (typeof HEX_ROW_WIDTHS)[number];

/** How a dump is laid out: how many bytes a line carries and whether it spells them out. */
export type HexDumpLayout = {
    ascii?: boolean | undefined;
    bytesPerRow?: HexRowWidth | undefined;
};

/**
 * How many bytes a dump shows at most. Dumping twenty megabytes took seconds and hundreds of
 * megabytes, and a hundred nearly reached the longest string the engine holds; past this the
 * owner of the bytes says how much was left out.
 */
export const HEX_DUMP_BYTES = 1_048_576;

/** The line every hex editor prints, which a dump is read in until the reader picks another. */
export const DEFAULT_HEX_ROW_WIDTH: HexRowWidth = 16;

/** The width a choice of the band names, as text; the default for one it does not. */
export function hexRowWidthOf(value: string): HexRowWidth {
    return HEX_ROW_WIDTHS.find((width) => String(width) === value) ?? DEFAULT_HEX_ROW_WIDTH;
}

function hexOf(byte: number): string {
    return byte.toString(HEX).toUpperCase().padStart(2, '0');
}

/** The byte as text where it spells one, and the dot every hex editor uses where it does not. */
function asciiOf(byte: number): string {
    if (byte < FIRST_PRINTABLE || byte > LAST_PRINTABLE) {
        return '.';
    }

    return String.fromCharCode(byte);
}

/** Two cells of air between the last byte and the text, and a blank cell per byte a line lacks. */
function cellsOf(row: readonly number[], width: number, ascii: boolean): string {
    const cells = row.map(hexOf).join(' ');

    if (!ascii) {
        return cells;
    }

    return `${cells.padEnd(width * 3 - 1)}  ${row.map(asciiOf).join('')}`;
}

function lineOf(bytes: Uint8Array, start: number, width: number, ascii: boolean): string {
    const row = Array.from(bytes.subarray(start, start + width));
    const offset = hexOf(start).padStart(OFFSET_DIGITS, '0');

    return `${offset}: ${cellsOf(row, width, ascii)}`;
}

/**
 * What arrived, byte by byte, the way every hex editor prints it: the offset of the line, its
 * bytes in capitals and what they spell. The width is the reader's, because a narrow dock and a
 * wide one hold a different number of columns, and so is the text: whoever reads a protocol of
 * pure numbers is not reading words out of it.
 */
export function hexDump(bytes: Uint8Array, layout: HexDumpLayout = {}): string {
    const width = layout.bytesPerRow ?? DEFAULT_HEX_ROW_WIDTH;
    const ascii = layout.ascii ?? true;
    const lines: string[] = [];

    for (let start = 0; start < bytes.length; start += width) {
        lines.push(lineOf(bytes, start, width, ascii));
    }

    return lines.join('\n');
}
