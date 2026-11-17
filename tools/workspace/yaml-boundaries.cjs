// The boundary of the YAML readers, apart from `.dependency-cruiser.cjs` so that file keeps its size.
// `never` is the helper that file builds its own rules with.

/** @param {(name: string, comment: string, from: string, to: string) => object} never */
module.exports = (never) => [
    never(
        'js-yaml-drops-comments',
        'js-yaml loses the comments of the files of the user: `yaml` is the only reader and writer. electron-updater brings js-yaml underneath, and that stays underneath.',
        '^(packages|apps|tools)/',
        'node_modules/js-yaml(/|$)',
    ),
];
