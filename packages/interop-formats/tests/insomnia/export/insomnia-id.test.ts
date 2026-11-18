import { describe, expect, it } from 'vitest';

import { insomniaIdOf } from '../../../src/insomnia/export/insomnia-id.js';

describe('insomniaIdOf', () => {
    it('is the prefix of its kind and a digest, the way Insomnia writes its ids', () => {
        expect(insomniaIdOf('req', 'Tienda', 'Lista')).toMatch(/^req_[0-9a-f]{32}$/);
        expect(insomniaIdOf('wrk', 'Tienda')).toMatch(/^wrk_[0-9a-f]{32}$/);
        expect(insomniaIdOf('fld', 'Tienda', 'Mascotas')).toMatch(/^fld_[0-9a-f]{32}$/);
        expect(insomniaIdOf('env', 'Tienda', 'base')).toMatch(/^env_[0-9a-f]{32}$/);
        expect(insomniaIdOf('ws-req', 'lobby')).toMatch(/^ws-req_[0-9a-f]{32}$/);
    });

    it('is the same for the same place, so importing again updates instead of copying', () => {
        expect(insomniaIdOf('req', 'Tienda', 'Lista')).toBe(insomniaIdOf('req', 'Tienda', 'Lista'));
    });

    it('differs for another place, another kind and another split of the same letters', () => {
        const id = insomniaIdOf('req', 'Tienda', 'Lista');

        expect(insomniaIdOf('req', 'Tienda', 'Alta')).not.toBe(id);
        expect(insomniaIdOf('fld', 'Tienda', 'Lista')).not.toBe(id);
        expect(insomniaIdOf('req', 'Tien', 'daLista')).not.toBe(id);
    });
});
