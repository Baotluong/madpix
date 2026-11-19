// Imported from the deep path on purpose: the package root would evaluate
// Skia's web module before CanvasKit (the WebAssembly build) has loaded.
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web/LoadSkiaWeb';

/** Loads CanvasKit from /canvaskit.wasm (copied into public/ by `npm run postinstall`). */
export const loadSkia = () => LoadSkiaWeb({ locateFile: (file: string) => `/${file}` });
