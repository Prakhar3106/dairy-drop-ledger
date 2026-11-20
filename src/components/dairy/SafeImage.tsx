import { useState, type ImgHTMLAttributes } from 'react';
import { Sprout } from 'lucide-react';
import { usePhotoUrl } from '@/lib/dairy/photos';

interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string | undefined;
}

export function SafeImage({ src, alt, className = '', fallbackTitle, ...rest }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={alt || fallbackTitle || 'Dairy visual'}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-beige to-sage text-forest p-4 text-center ${className}`}
      >
        <Sprout className="w-7 h-7 mb-1.5 opacity-80" />
        {fallbackTitle && <span className="text-xs font-medium text-deep">{fallbackTitle}</span>}
      </div>
    );
  }
  return <img src={src} alt={alt} referrerPolicy="no-referrer" onError={() => setFailed(true)} className={className} {...rest} />;
}

/** Shows a private stored photo (signed URL), falling back to a default image. */
export function StoredPhoto({ path, fallbackSrc, alt, className, fallbackTitle }: { path: string | null | undefined; fallbackSrc?: string | undefined; alt: string; className?: string | undefined; fallbackTitle?: string | undefined }) {
  const { data: url, isLoading } = usePhotoUrl(path);
  if (path && isLoading) return <div className={`bg-beige animate-pulse ${className ?? ''}`} aria-hidden="true" />;
  return <SafeImage src={url ?? fallbackSrc} alt={alt} className={className} fallbackTitle={fallbackTitle} />;
}
