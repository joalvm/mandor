export type IconSourceEntry = {
    state: 'candidate' | 'approved';
    source:
        | { origin: 'codicons'; id: string; sha256: string; license: string }
        | {
              origin: 'own' | 'derived';
              file: string;
              base?: string | undefined;
              sha256: string;
              license: string;
          };
    svg: string;
};

export function readIconSources(options?: {
    packageRoot?: string;
    providerRoot?: string;
}): Promise<{
    provider: { package: string; version: string };
    intentions: Record<string, IconSourceEntry>;
}>;
