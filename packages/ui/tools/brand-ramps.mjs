/**
 * The two ramps the accent of an app is drawn from: teal for the one that keeps connections
 * open, orange for the one that sends requests. Step 9 of each dark ramp is the hue of its logo,
 * and every step around it was chosen to keep the contrast the semantic layer asks of the accent.
 */
const TEAL_LIGHT = [
    '#fafdfe',
    '#f2fbfb',
    '#def9f9',
    '#caf4f6',
    '#b5ecf0',
    '#9de1e7',
    '#7dd4dc',
    '#3dc2cf',
    '#0e7c8c',
    '#0c6f7e',
    '#056072',
    '#0b3a44',
];
const TEAL_DARK = [
    '#0b171a',
    '#101c20',
    '#082f36',
    '#003c48',
    '#004a58',
    '#045a68',
    '#126d7e',
    '#11889c',
    '#18cccc',
    '#19d6d6',
    '#77d9e7',
    '#cbf1f7',
];
const ORANGE_LIGHT = [
    '#fefcfb',
    '#fff8ed',
    '#fff1d6',
    '#ffe2b5',
    '#ffd59a',
    '#ffc682',
    '#f5b473',
    '#ec9b55',
    '#ba5104',
    '#a74903',
    '#913f03',
    '#58301d',
];
const ORANGE_DARK = [
    '#17120e',
    '#1e170f',
    '#33200b',
    '#462400',
    '#562c00',
    '#66390c',
    '#7e491d',
    '#a35d29',
    '#fb8d3c',
    '#fb9a51',
    '#fca86b',
    '#ffe3c2',
];

/** The ramps by name, light then dark; the first is the one a window that names none paints. */
export const BRAND_RAMPS = {
    teal: [TEAL_LIGHT, TEAL_DARK],
    orange: [ORANGE_LIGHT, ORANGE_DARK],
};
