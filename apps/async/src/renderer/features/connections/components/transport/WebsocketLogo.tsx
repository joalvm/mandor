type WebsocketLogoProps = {
    className?: string | undefined;
};

/**
 * The WebSocket mark of the outside world, drawn in `currentColor` so the window hues it: the
 * shape carries the identity and the colour comes from whatever box it lands in.
 */
export function WebsocketLogo({ className }: WebsocketLogoProps) {
    return (
        <svg
            aria-hidden="true"
            className={className}
            data-part="websocket-logo"
            fill="currentColor"
            focusable="false"
            viewBox="0 0 16 16"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M11.669 10.767h1.81V6.422L11.44 4.383l-1.28 1.28 1.509 1.509v3.596zm1.814.907l-6.313-.001-1.509-1.509.64-.64 1.246 1.246h2.564L7.585 8.239l.645-.645 2.526 2.526V7.556L9.515 6.314l.635-.635-3.137-3.152L.71 2.526l1.805 1.805v.005h3.744l1.323 1.323-1.934 1.934L4.325 6.27V5.243h-1.81v1.776l3.132 3.133-1.275 1.275 2.039 2.039 8.877.001-1.805-1.796z" />
        </svg>
    );
}
