export { calculateSimilarity, matchActivityCriteria } from './drlCalculator';

export function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

export function getFileExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? (parts.pop() ?? 'dat').toLowerCase() : 'dat';
}

function stripQuery(url: string): string {
  return url.split(/[?#]/)[0];
}

export function isImageFile(nameOrType: string): boolean {
  const v = nameOrType.toLowerCase();
  if (v.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(stripQuery(v));
}

export function isPdfFile(nameOrType: string): boolean {
  const v = nameOrType.toLowerCase();
  if (v === 'application/pdf') return true;
  return /\.pdf$/i.test(stripQuery(v));
}

/**
 * Tách danh sách URL thành ảnh / tài liệu.
 * Ưu tiên MIME type đi kèm (đúng cả với blob: preview không có đuôi file);
 * thiếu type thì đoán bằng đuôi URL như cũ. Bỏ qua chuỗi rỗng.
 */
export function splitMedia(
  fileUrls: string[],
  fileTypes?: (string | undefined)[],
): { images: string[]; docs: string[] } {
  const images: string[] = [];
  const docs: string[] = [];
  fileUrls.forEach((u, i) => {
    if (!u) return;
    const t = fileTypes?.[i] ?? '';
    if (t ? t.toLowerCase().startsWith('image/') : isImageFile(u)) images.push(u);
    else docs.push(u);
  });
  return { images, docs };
}
