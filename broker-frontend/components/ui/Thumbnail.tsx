'use client';

import { fileUrl } from '@/lib/api';

export function Thumbnail({
  photoUrl,
  alt,
  size = 56,
  radius = 8,
  aspectRatio,
  className = '',
}: {
  photoUrl?: string;
  alt: string;
  size?: number;
  radius?: number;
  /** When set (e.g. '4 / 3'), the thumbnail fills its container width instead of using a fixed size */
  aspectRatio?: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-paper-line overflow-hidden ${aspectRatio ? 'w-full' : 'shrink-0'} ${className}`}
      style={{
        width: aspectRatio ? '100%' : size,
        height: aspectRatio ? undefined : size,
        aspectRatio,
        borderRadius: radius,
      }}
    >
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fileUrl(photoUrl)} alt={alt} className="w-full h-full object-cover" />
      )}
    </div>
  );
}
