import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/**
 * RichText — renderer cho "format chung" của thông báo / thể lệ hoạt động.
 * Nhẹ, an toàn (không dùng HTML thô), chấp nhận paste tự nhiên:
 *
 *   # Tiêu đề lớn          → heading đậm
 *   ## Tiêu đề phụ         → heading nhỏ
 *   - Mục một              → gạch đầu dòng (cả • và *)
 *   **chữ đậm**            → in đậm
 *   https://any.link       → link bấm được
 *   Dòng trống             → cách đoạn
 *
 * Paste text thường không có ký tự gì cũng hiện đẹp (mỗi dòng 1 dòng, giữ khoảng cách đoạn).
 */

const URL_RE = /(https?:\/\/[^\s<>()]+)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const boldParts = text.split(/\*\*(.+?)\*\*/g);
  boldParts.forEach((part, i) => {
    if (i % 2 === 1) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i}`} className="font-bold text-black dark:text-white">
          {part}
        </strong>,
      );
      return;
    }
    const linkParts = part.split(URL_RE);
    linkParts.forEach((lp, j) => {
      if (!lp) return;
      if (/^https?:\/\//.test(lp)) {
        nodes.push(
          <a
            key={`${keyPrefix}-l${i}-${j}`}
            href={lp}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3390ec] dark:text-[#4fc3f7] font-medium hover:underline break-all"
          >
            {lp}
          </a>,
        );
      } else {
        nodes.push(<span key={`${keyPrefix}-t${i}-${j}`}>{lp}</span>);
      }
    });
  });
  return nodes;
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = (text ?? '').replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let bulletStart = -1;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${bulletStart}`} className="list-disc pl-5 space-y-0.5 marker:text-[#3390ec]/70">
        {bullets.map((b, i) => (
          <li key={i}>{renderInline(b, `li-${bulletStart}-${i}`)}</li>
        ))}
      </ul>,
    );
    bullets = [];
    bulletStart = -1;
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const bulletMatch = line.match(/^\s*[-•*]\s+(.*)/);
    if (bulletMatch) {
      if (bullets.length === 0) bulletStart = i;
      bullets.push(bulletMatch[1]);
      return;
    }
    flushBullets();
    if (!line.trim()) {
      blocks.push(<div key={`sp-${i}`} className="h-1.5" />);
      return;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)/);
    if (heading) {
      const level = heading[1].length;
      blocks.push(
        <p
          key={`h-${i}`}
          className={cn(
            'font-bold text-black dark:text-white',
            level === 1 && 'text-[15px]',
            level === 2 && 'text-[14px]',
            level === 3 && 'text-[13.5px]',
          )}
        >
          {renderInline(heading[2], `h-${i}`)}
        </p>,
      );
      return;
    }
    blocks.push(
      <p key={`p-${i}`} className="leading-relaxed">
        {renderInline(line, `p-${i}`)}
      </p>,
    );
  });
  flushBullets();

  if (blocks.length === 0) return null;

  return (
    <div className={cn('text-[13px] text-black/75 dark:text-white/75 space-y-0.5 break-words', className)}>
      {blocks}
    </div>
  );
}

/** Mẫu format chung để chèn nhanh trong composer admin. */
export const NOTIFICATION_TEMPLATE = `# Thông báo
- Thời gian:
- Địa điểm:
- Hạn nộp minh chứng:
**Lưu ý:** `;
