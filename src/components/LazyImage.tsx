import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  fallback?: React.ReactNode;
}

export function LazyImage({ src, alt, className = "", skeletonClassName = "", fallback }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "50px", // Start loading 50px before the image comes into view
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div ref={imgRef} className={className}>
      {!isLoaded && !hasError && (
        <Skeleton className={skeletonClassName || "w-full h-full"} />
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`${className} ${isLoaded ? 'block' : 'hidden'}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          loading="lazy"
        />
      )}
      {hasError && !fallback && (
        <div className={`${skeletonClassName} bg-muted flex items-center justify-center text-xs text-muted-foreground`}>
          Failed to load
        </div>
      )}
    </div>
  );
}
