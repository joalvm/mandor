import { describe, expect, it } from 'vitest';

import { statusLabelOf } from '../../../../src/renderer/features/requests/lib/status-label.js';

describe('a status with its name (statusLabelOf)', () => {
    it('puts the name after the code', () => {
        expect(statusLabelOf('404')).toBe('404 Not Found');
        expect(statusLabelOf('201')).toBe('201 Created');
    });

    it('leaves a code nobody named, and the default, as they are', () => {
        expect(statusLabelOf('418')).toBe('418');
        expect(statusLabelOf('default')).toBe('default');
    });
});
