import Image from "next/image";
import { cn } from "@/lib/utils";
import { AI_NAME, INSTALLER_NAME } from "@/config";

/**
 * The Sunny brand assets.
 *
 * Both files are transparent PNGs trimmed to their artwork, so they sit on
 * either theme without a white plate behind them. Defined once here so sizes
 * and alt text stay consistent wherever the logo appears.
 */

export const BRAND_MARK_SRC = "/brand/sunny-mark.png";
export const BRAND_WORDMARK_SRC = "/brand/sunny-wordmark.png";
export const BRAND_WORDMARK_DARK_SRC = "/brand/sunny-wordmark-dark.png";

/** The sun character on its own. Used as the avatar and the hero icon. */
export function SunnyMark({
  size = 32,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={BRAND_MARK_SRC}
      alt={`${AI_NAME}`}
      width={size}
      // The artwork is slightly wider than tall (512x470); height follows so
      // it never stretches.
      height={Math.round((size * 470) / 512)}
      className={cn("select-none", className)}
      priority={priority}
      draggable={false}
    />
  );
}

/**
 * The "Sunny" wordmark.
 *
 * Two files rather than a CSS filter: the logo green is too dark to read on a
 * dark ground, so a light-green variant is swapped in. The amber sparkles are
 * identical in both, and only one is ever visible.
 */
export function SunnyWordmark({
  height = 22,
  className,
  priority = false,
}: {
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  // Source is 640x222.
  const width = Math.round((height * 640) / 222);
  const shared = cn("select-none", className);

  return (
    <>
      <Image
        src={BRAND_WORDMARK_SRC}
        alt={AI_NAME}
        width={width}
        height={height}
        className={cn(shared, "block dark:hidden")}
        priority={priority}
        draggable={false}
      />
      <Image
        src={BRAND_WORDMARK_DARK_SRC}
        alt=""
        aria-hidden
        width={width}
        height={height}
        className={cn(shared, "hidden dark:block")}
        priority={priority}
        draggable={false}
      />
    </>
  );
}

/** Mark plus wordmark, for the header. */
export function SunnyLockup({
  className,
  wordmarkHeight = 20,
  markSize = 30,
}: {
  className?: string;
  wordmarkHeight?: number;
  markSize?: number;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <SunnyMark size={markSize} priority />
      <SunnyWordmark height={wordmarkHeight} priority />
      <span className="sr-only">
        {AI_NAME}, {INSTALLER_NAME}
      </span>
    </div>
  );
}
