/**
 * Image Loading Cache
 * Prevents multiple Image object creations for the same URL
 * Improves performance and reduces memory usage
 */

type ImageLoadCallback = (loaded: boolean) => void;

interface ImageCacheEntry {
  promise: Promise<boolean>;
  loaded: boolean;
}

const imageCache = new Map<string, ImageCacheEntry>();
const callbacks = new Map<string, Set<ImageLoadCallback>>();

/**
 * Preload an image and cache the result
 * Returns a promise that resolves when the image is loaded
 */
export function preloadImage(src: string): Promise<boolean> {
  // Return cached promise if available
  if (imageCache.has(src)) {
    const cached = imageCache.get(src)!;
    return cached.promise;
  }

  // Create new load promise
  const promise = new Promise<boolean>((resolve) => {
    const img = new Image();

    const handleLoad = () => {
      cleanup();
      imageCache.set(src, { promise, loaded: true });
      notifyCallbacks(src, true);
      resolve(true);
    };

    const handleError = () => {
      cleanup();
      imageCache.set(src, { promise, loaded: true });
      notifyCallbacks(src, true);
      resolve(true); // Still resolve to allow graceful fallback
    };

    const cleanup = () => {
      img.removeEventListener("load", handleLoad);
      img.removeEventListener("error", handleError);
    };

    img.addEventListener("load", handleLoad);
    img.addEventListener("error", handleError);
    img.src = src;
  });

  imageCache.set(src, { promise, loaded: false });
  return promise;
}

/**
 * Check if image is already loaded
 */
export function isImageLoaded(src: string): boolean {
  const cached = imageCache.get(src);
  return cached?.loaded ?? false;
}

/**
 * Subscribe to image load events
 */
export function onImageLoad(
  src: string,
  callback: ImageLoadCallback,
): () => void {
  if (!callbacks.has(src)) {
    callbacks.set(src, new Set());
  }

  const callbackSet = callbacks.get(src)!;
  callbackSet.add(callback);

  // If already loaded, call immediately
  if (isImageLoaded(src)) {
    callback(true);
  }

  // Return unsubscribe function
  return () => {
    callbackSet.delete(callback);
    if (callbackSet.size === 0) {
      callbacks.delete(src);
    }
  };
}

/**
 * Notify all subscribers of image load
 */
function notifyCallbacks(src: string, loaded: boolean): void {
  const callbackSet = callbacks.get(src);
  if (callbackSet) {
    callbackSet.forEach((callback) => {
      callback(loaded);
    });
  }
}

/**
 * Clear cache (useful for testing or memory management)
 */
export function clearImageCache(): void {
  imageCache.clear();
  callbacks.clear();
}
