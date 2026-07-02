/**
 * Platform detection and native feature wrappers.
 *
 * All @capacitor/* imports use dynamic import() with try/catch so this file
 * can be used safely in the web-only `smarty/` package where Capacitor is
 * not installed (it lives only in `smarty-mobile/`).
 */

// ---------------------------------------------------------------------------
// Internal helpers
//
// All Capacitor imports use dynamic import() with try/catch.  Since the
// @capacitor/* packages are NOT installed in the smarty/ workspace (they
// live only in smarty-mobile/), we never use typeof import(...) in type
// positions — TypeScript would fail to resolve the module.  Instead we
// cast the return value to the minimal shape we need.
// ---------------------------------------------------------------------------

interface CapacitorCore {
  Capacitor: {
    isNativePlatform(): boolean;
    getPlatform(): string;
  };
}

// Use variable references so TypeScript does not try to resolve the module
// path at compile time (the packages are not installed in smarty/).
const CAPACITOR_CORE = '@capacitor/core';
const CAPACITOR_CAMERA = '@capacitor/camera';
const CAPACITOR_SHARE = '@capacitor/share';

async function loadCapacitor(): Promise<CapacitorCore | null> {
  try {
    return (await import(CAPACITOR_CORE)) as CapacitorCore;
  } catch {
    return null;
  }
}

/**
 * Minimal shape of the @capacitor/camera module.
 *
 * Note: CameraResultType and CameraSource are module-level named exports,
 * not properties of the Camera class itself.
 */
interface CapacitorCameraModule {
  Camera: {
    getPhoto(options: {
      quality: number;
      allowEditing: boolean;
      resultType: string;
      source: string;
    }): Promise<{ path?: string; webPath?: string } | null>;
  };
  CameraResultType: { Uri: string };
  CameraSource: { Camera: string };
}

async function loadCapacitorCamera(): Promise<CapacitorCameraModule | null> {
  try {
    return (await import(CAPACITOR_CAMERA)) as CapacitorCameraModule;
  } catch {
    return null;
  }
}

interface CapacitorShareModule {
  Share: {
    share(options: { title: string; text: string; url: string }): Promise<void>;
  };
}

async function loadCapacitorShare(): Promise<CapacitorShareModule | null> {
  try {
    return (await import(CAPACITOR_SHARE)) as CapacitorShareModule;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the code is running inside a Capacitor native shell
 * (iOS or Android).  Returns `false` in a regular browser or when the
 * Capacitor package is not available at all.
 */
export async function isNativePlatform(): Promise<boolean> {
  const cap = await loadCapacitor();
  if (!cap?.Capacitor) return false;
  return cap.Capacitor.isNativePlatform();
}

/**
 * Returns the current platform identifier.
 *
 * - `"ios"`   – native iOS (Capacitor)
 * - `"android"` – native Android (Capacitor)
 * - `"web"`   – browser / SSR / unknown
 */
export async function getPlatform(): Promise<'ios' | 'android' | 'web'> {
  const cap = await loadCapacitor();
  if (!cap?.Capacitor) return 'web';

  const platform = cap.Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}

/**
 * Take a photo using the device camera.
 *
 * **Native** – opens the Capacitor Camera plugin (with user confirmation
 *              for permission if needed).
 * **Web**     – creates a transient `<input type="file" accept="image/*"
 *              capture="environment">`, clicks it, and reads back the
 *              selected image as a data URL.
 *
 * @returns An object with a local `path` and an optional `webPath`, or
 *          `null` if the user cancelled the operation.
 */
export async function takePhoto(): Promise<{ path: string; webPath?: string } | null> {
  // -- Native path -----------------------------------------------------------
  if (await isNativePlatform()) {
    const camera = await loadCapacitorCamera();
    if (!camera?.Camera) {
      // Fall through to the web fallback below
      return webTakePhoto();
    }

    try {
      const photo = await camera.Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: camera.CameraResultType.Uri,
        source: camera.CameraSource.Camera,
      });

      if (!photo || (!photo.path && !photo.webPath)) {
        return null;
      }

      return {
        path: photo.path ?? photo.webPath ?? '',
        webPath: photo.webPath,
      };
    } catch (err: unknown) {
      // Capacitor throws "User cancelled photos app" or similar on cancel
      if (isCancelError(err)) return null;
      throw err;
    }
  }

  // -- Web fallback ----------------------------------------------------------
  return webTakePhoto();
}

/**
 * Web-only camera fallback using a hidden file input.
 */
function webTakePhoto(): Promise<{ path: string; webPath?: string } | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // The "path" is the data URL so downstream code always has something
        // to work with; webPath is omitted since it's not a native file URI.
        resolve({ path: dataUrl });
      };
      reader.onerror = () => {
        reject(new Error('Failed to read selected image'));
      };
      reader.readAsDataURL(file);
    });

    // If the user closes the file picker without selecting anything the
    // "change" event may not fire.  We listen for "cancel" via the native
    // `cancel` event (Chromium) plus a focus-loss heuristic.
    input.addEventListener('cancel', () => resolve(null));

    // Click the input *before* attaching it to the DOM so the browser
    // doesn't show a flash of a hidden element.
    input.click();

    // Clean up the DOM element after a reasonable delay.
    setTimeout(() => {
      if (input.parentNode) input.parentNode.removeChild(input);
    }, 60_000);
  });
}

/**
 * Try to determine whether a Capacitor exception is a user-cancellation
 * rather than a genuine error.
 */
function isCancelError(err: unknown): boolean {
  if (typeof err === 'string') {
    return /cancel|dismiss|user cancelled/i.test(err);
  }
  if (err && typeof err === 'object') {
    const msg =
      (err as { message?: string }).message ??
      String(err);
    return /cancel|dismiss|user cancelled/i.test(msg);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Share
// ---------------------------------------------------------------------------

/**
 * Share product information.
 *
 * **Native** – uses the Capacitor Share plugin (native share sheet).
 * **Web (modern)** – calls `navigator.share()` (Web Share API).
 * **Web (fallback)** – copies the product URL to the clipboard as a last
 *                      resort so the user can paste it manually.
 */
export async function shareProduct(
  title: string,
  text: string,
  url: string,
): Promise<void> {
  // -- Native path -----------------------------------------------------------
  if (await isNativePlatform()) {
    const sharePlugin = await loadCapacitorShare();
    if (sharePlugin?.Share) {
      try {
        await sharePlugin.Share.share({ title, text, url });
        return;
      } catch (err: unknown) {
        // User cancelled the share sheet – not an error
        if (isCancelError(err)) return;
        // Fall through to the web fallback on unexpected errors
      }
    }
  }

  // -- Web path --------------------------------------------------------------
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (err: unknown) {
      // AbortError = user cancelled the share dialog
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Fall through to clipboard fallback
    }
  }

  // -- Clipboard fallback (last resort) --------------------------------------
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Clipboard access may be denied – silently swallow because there is
    // nothing else we can do and we must not throw to the caller.
  }
}
