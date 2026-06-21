import { useState } from 'react';
import { UserSquare2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AvatarCardPreview({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <>
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-[var(--muted)] to-[var(--muted)]/60" />
      )}
      {!error ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className={cn(
            'h-full w-full object-cover object-top transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[var(--muted)]">
          <UserSquare2 className="h-12 w-12 text-[var(--muted-foreground)]" />
        </div>
      )}
    </>
  );
}
