import { describe, expect, it } from 'vitest';
import { formatDateTime, formatTime, formatDateLabel, formatFileSize } from './formatters';

describe('formatters', () => {
  it('formatDateTime theo mẫu dd/mm/yyyy hh:mm', () => {
    expect(formatDateTime(1718000000000)).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  it('formatDateTime rỗng khi timestamp = 0', () => {
    expect(formatDateTime(0)).toBe('');
  });

  it('formatTime theo mẫu hh:mm', () => {
    expect(formatTime(1718000000000)).toMatch(/^\d{2}:\d{2}$/);
  });

  it('formatDateLabel: hôm nay / hôm qua', () => {
    expect(formatDateLabel(Date.now())).toBe('Hôm nay');
    expect(formatDateLabel(Date.now() - 86400000)).toBe('Hôm qua');
  });

  it('formatFileSize các mốc B/KB/MB', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1048576)).toBe('1.0 MB');
  });
});
