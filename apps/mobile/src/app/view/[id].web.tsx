import { lazySkia } from '@/lib/lazy-skia';

export default lazySkia(() => import('@/screens/page-viewer'));
