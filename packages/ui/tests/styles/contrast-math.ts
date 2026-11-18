import type { ThemeValues } from './theme-values.js';

export type Color = { red: number; green: number; blue: number; alpha: number };

function colorOf(hex: string): Color {
    const value = hex.slice(1);

    return {
        red: Number.parseInt(value.slice(0, 2), 16) / 255,
        green: Number.parseInt(value.slice(2, 4), 16) / 255,
        blue: Number.parseInt(value.slice(4, 6), 16) / 255,
        alpha: value.length === 8 ? Number.parseInt(value.slice(6, 8), 16) / 255 : 1,
    };
}

function blend(foreground: Color, background: Color): Color {
    const inverse = 1 - foreground.alpha;

    return {
        red: foreground.red * foreground.alpha + background.red * inverse,
        green: foreground.green * foreground.alpha + background.green * inverse,
        blue: foreground.blue * foreground.alpha + background.blue * inverse,
        alpha: 1,
    };
}

function luminanceOf(color: Color): number {
    const linear = [color.red, color.green, color.blue].map((channel) =>
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );

    return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
}

export function renderedColor(theme: ThemeValues, name: string): Color {
    const color = colorOf(theme[name] ?? '');
    const app = colorOf(theme['surface-app'] ?? '');

    return color.alpha === 1 ? color : blend(color, app);
}

export function contrastOf(first: Color, second: Color): number {
    const values = [luminanceOf(first), luminanceOf(second)].sort((left, right) => right - left);

    return ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05);
}
