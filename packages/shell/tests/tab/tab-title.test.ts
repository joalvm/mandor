import { afterEach, describe, expect, it } from 'vitest';

import { shownTitle, tabTitleOf } from '../../src/tab/tab-title.js';
import { declareTabKindSpec, translatorIn } from '../../src/testing/tab-kind.js';

const UNREGISTER: (() => void)[] = [];

afterEach(() => {
    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }
});

describe('the title of a tab', () => {
    it('is the one its kind says', () => {
        UNREGISTER.push(
            declareTabKindSpec({
                closable: true,
                icon: 'file',
                id: 'doc',
                title: (resource) => resource.slice(resource.lastIndexOf('/') + 1),
            }),
        );

        expect(
            tabTitleOf(
                { id: 'one', kind: 'doc', resource: 'mandor://r/w/doc/one.md' },
                translatorIn(),
            ),
        ).toBe('one.md');
    });

    it('draws nothing while the name is on its way', () => {
        expect(shownTitle(null, translatorIn())).toBe('');
    });

    it('is said in the language it is asked in', () => {
        UNREGISTER.push(
            declareTabKindSpec({
                closable: true,
                icon: 'file',
                id: 'conflict',
                title: (_resource, translate) => translate('conflicts:tabTitle'),
            }),
        );

        expect(
            tabTitleOf(
                { id: 'one', kind: 'conflict', resource: 'mandor://r/w/c' },
                translatorIn('es'),
            ),
        ).toBe('Conflictos');
    });

    it('is untitled, never the resource, when nobody declared its kind', () => {
        expect(
            tabTitleOf(
                { id: 'one', kind: 'gone', resource: 'mandor://r/w/gone/one' },
                translatorIn('es'),
            ),
        ).toBe('Sin título');
    });

    it('is untitled when its kind has no name to give yet', () => {
        UNREGISTER.push(
            declareTabKindSpec({ closable: true, icon: 'file', id: 'cold', title: () => '' }),
        );

        expect(
            tabTitleOf(
                { id: 'one', kind: 'cold', resource: 'mandor://r/w/item/a/b' },
                translatorIn('en'),
            ),
        ).toBe('Untitled');
    });
});

describe('the title a tab shows', () => {
    it('keeps a name as it is', () => {
        expect(shownTitle('Crear pedido', translatorIn('es'))).toBe('Crear pedido');
    });

    it('says the word of the interface when the name is empty', () => {
        expect(shownTitle('', translatorIn('es'))).toBe('Sin título');
    });
});
