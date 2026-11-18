// The markup layout of js-beautify, imported alone: the package entry drags in its JavaScript and
// CSS beautifiers too. Its types live next to this file, where every program that imports it
// finds them.
import layOutHtml from 'js-beautify/js/src/html/index.js';

/**
 * The markup laid out. No beautifier of scripts or styles is handed over, so what a `<script>` or
 * a `<style>` holds keeps its own lines and only moves with the indentation around it.
 */
export function beautifyMarkup(source, options) {
    return layOutHtml(source, options);
}
