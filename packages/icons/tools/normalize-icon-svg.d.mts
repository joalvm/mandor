export type NormalizedIconPath = {
    d: string;
    fillRule?: string | undefined;
    clipRule?: string | undefined;
};

export function normalizeIconSvg(xml: string, label?: string): { paths: NormalizedIconPath[] };
