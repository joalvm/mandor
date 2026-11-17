import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useBodyShow } from '../../../src/renderer/response/hooks/useBodyShow.js';

describe('useBodyShow', () => {
    it('opens an image drawn and a page as its text', () => {
        expect(renderHook(() => useBodyShow('image', true)).result.current.preview).toBe(true);
        expect(renderHook(() => useBodyShow('html', true)).result.current).toMatchObject({
            format: 'html',
            preview: false,
            previewable: true,
            wrap: true,
        });
    });

    it('leaves the drawing when the reader picks a format', () => {
        const { result } = renderHook(() => useBodyShow('image', true));

        act(() => {
            result.current.setFormat('base64');
        });

        expect(result.current).toMatchObject({ format: 'base64', preview: false });
    });

    it('never draws what cannot be drawn, whatever was asked', () => {
        const { result } = renderHook(() => useBodyShow('xml', true));

        act(() => {
            result.current.setPreview(true);
            result.current.setWrap(false);
        });

        expect(result.current).toMatchObject({ preview: false, previewable: false, wrap: false });
    });
});
