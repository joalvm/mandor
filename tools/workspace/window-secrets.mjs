/**
 * Where the value of a secret sits in a window: under which global it is held, and which of its
 * spellings the document shows — the console, the answer, the activity and every field are in it.
 * Both lists empty is the proof the edges of main kept it out.
 */
export async function secretInWindow(page, secret) {
    const held = await page.evaluate((needle) => {
        const found = [];
        let budget = 4000;

        function walk(node, path, depth) {
            if (budget <= 0 || depth > 4 || node === null || typeof node !== 'object') {
                return;
            }

            budget -= 1;

            for (const [key, value] of Object.entries(node)) {
                if (typeof value !== 'string') {
                    walk(value, `${path}.${key}`, depth + 1);

                    continue;
                }

                if (value.includes(needle)) {
                    found.push(`${path}.${key}`);
                }
            }
        }

        walk(globalThis, 'window', 0);

        return found;
    }, secret);
    const shown = await page.evaluate(
        (needles) => {
            const fields = [...globalThis.document.querySelectorAll('input, textarea')].map(
                (field) => field.value,
            );
            const text = [globalThis.document.documentElement.outerHTML, ...fields].join(' ');

            return needles.filter((needle) => text.includes(needle));
        },
        [secret, Buffer.from(secret).toString('base64'), encodeURIComponent(secret)],
    );

    return { held, shown };
}
