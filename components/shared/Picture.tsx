import Image from "next/image";

/**
 * A banner, cover or news picture that may be a site file, an upload or an address an
 * admin typed in. Site files and uploads go through Next's image optimizer, so a phone
 * on mobile data gets a WebP sized for its screen instead of the original (the jubilee
 * artwork is 385 KB at full size, about 30 KB at phone size). Other addresses are shown
 * as they are: the optimizer only serves this site's own images.
 */
export default function Picture({
  src,
  alt,
  sizes,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  /** How wide the picture is shown, e.g. "(max-width: 768px) 100vw, 33vw". */
  sizes: string;
  className?: string;
  /** The page's main image: load it first. */
  priority?: boolean;
}) {
  const local = src.startsWith("/") && !src.startsWith("//");
  if (!local) {
    return (
      <img src={src} alt={alt} className={className} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" />
    );
  }
  // width/height set the aspect for the generated sizes; CSS on className sets the box.
  return (
    <Image
      src={src}
      alt={alt}
      width={1600}
      height={900}
      sizes={sizes}
      className={className}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
