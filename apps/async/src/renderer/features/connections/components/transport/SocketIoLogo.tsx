type SocketIoLogoProps = {
    className?: string | undefined;
};

/**
 * The Socket.IO mark of the outside world, drawn in `currentColor` so the window hues it: the
 * ring is a hole in the disc and the bolt rides on top of it, both one colour.
 */
export function SocketIoLogo({ className }: SocketIoLogoProps) {
    return (
        <svg
            aria-hidden="true"
            className={className}
            data-part="socket-io-logo"
            fill="currentColor"
            focusable="false"
            viewBox="0 0 16 16"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M6.201 1.128c1.838-.471 3.87-.197 5.491.804 2.042 1.221 3.375 3.531 3.409 5.908.075 2.401-1.177 4.782-3.188 6.088-2.239 1.506-5.335 1.564-7.621.132C1.962 12.669.602 9.864.951 7.171c.281-2.846 2.479-5.355 5.25-6.044zm-.282 1.163c-2.476.868-4.206 3.473-3.965 6.098.092 3.242 3.212 5.98 6.441 5.657 3.395-.098 6.176-3.504 6.176-3.504z" />
            <path d="M6.05 7.594c1.753-1.432 3.468-2.914 5.26-4.305-.94 1.444-1.906 2.869-2.846 4.312-.806.004-1.612.004-2.414-.008zm1.482.798c.81 0 1.616 0 2.422.011-1.765 1.425-3.472 2.918-5.267 4.305.94-1.444 1.906-2.872 2.846-4.316z" />
        </svg>
    );
}
