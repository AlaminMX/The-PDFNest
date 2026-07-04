interface BookLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

/**
 * A simple, CSS-only book-flip loading animation.
 * Book lies flat (top-down view), spine down the middle, pages flip
 * from the right stack to the left stack one at a time, looping.
 */
export function BookLoader({ message = "Loading...", fullScreen = true }: BookLoaderProps) {
  return (
    <div
      className={
        fullScreen
          ? "min-h-screen flex items-center justify-center"
          : "flex items-center justify-center py-8"
      }
    >
      <div className="text-center space-y-5">
        <div className="book-loader">
          <div className="book-loader__page book-loader__page--1" />
          <div className="book-loader__page book-loader__page--2" />
          <div className="book-loader__page book-loader__page--3" />
          <div className="book-loader__cover-left" />
          <div className="book-loader__cover-right" />
        </div>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>

      <style>{`
        .book-loader {
          position: relative;
          width: 96px;
          height: 64px;
          margin: 0 auto;
        }

        .book-loader__cover-left,
        .book-loader__cover-right {
          position: absolute;
          top: 0;
          width: 48px;
          height: 64px;
          background: hsl(var(--muted));
          border: 1px solid hsl(var(--border));
        }

        .book-loader__cover-left {
          left: 0;
          border-radius: 4px 0 0 4px;
        }

        .book-loader__cover-right {
          right: 0;
          border-radius: 0 4px 4px 0;
        }

        .book-loader__page {
          position: absolute;
          top: 1px;
          right: 1px;
          width: 47px;
          height: 62px;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 0 3px 3px 0;
          transform-origin: left center;
          transform-style: preserve-3d;
          animation: book-flip 1.8s ease-in-out infinite;
        }

        .book-loader__page--1 {
          animation-delay: 0s;
          z-index: 3;
        }

        .book-loader__page--2 {
          animation-delay: 0.6s;
          z-index: 2;
        }

        .book-loader__page--3 {
          animation-delay: 1.2s;
          z-index: 1;
        }

        @keyframes book-flip {
          0% {
            transform: rotateY(0deg);
            background: hsl(var(--card));
          }
          45% {
            transform: rotateY(-140deg);
            background: hsl(var(--card));
          }
          50% {
            transform: rotateY(-180deg);
            background: hsl(var(--muted) / 0.6);
          }
          50.01% {
            transform: rotateY(-180deg);
          }
          100% {
            transform: rotateY(-180deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .book-loader__page {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
