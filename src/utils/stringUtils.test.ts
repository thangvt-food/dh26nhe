import { describe, expect, it } from 'vitest';
import { sanitizeFileName, getFileExtension, isImageFile, isPdfFile, splitMedia } from './stringUtils';

describe('sanitizeFileName', () => {
  it('khử dấu tiếng Việt và ký tự đặc biệt', () => {
    expect(sanitizeFileName('Minh chứng 01.jpg')).toBe('Minh_chung_01.jpg');
  });

  it('gộp gạch dưới liên tiếp', () => {
    expect(sanitizeFileName('a   b.png')).toBe('a_b.png');
  });
});

describe('getFileExtension', () => {
  it('lấy đuôi file chữ thường', () => {
    expect(getFileExtension('anh.JPG')).toBe('jpg');
    expect(getFileExtension('tailieu.pdf')).toBe('pdf');
  });

  it('trả về dat khi không có đuôi', () => {
    expect(getFileExtension('khong-duoi')).toBe('dat');
  });
});

describe('isImageFile / isPdfFile', () => {
  it('nhận diện ảnh qua MIME và đuôi file', () => {
    expect(isImageFile('image/jpeg')).toBe(true);
    expect(isImageFile('anh.PNG')).toBe(true);
    expect(isImageFile('anh.webp?token=123')).toBe(true);
    expect(isImageFile('tailieu.pdf')).toBe(false);
  });

  it('nhận diện URL Firebase có query token', () => {
    expect(
      isImageFile('https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg?alt=media&token=abc'),
    ).toBe(true);
    expect(
      isPdfFile('https://firebasestorage.googleapis.com/v0/b/x/o/a.pdf?alt=media&token=abc'),
    ).toBe(true);
  });
  it('nhận diện PDF', () => {
    expect(isPdfFile('application/pdf')).toBe(true);
    expect(isPdfFile('tailieu.PDF')).toBe(true);
    expect(isPdfFile('anh.jpg')).toBe(false);
  });
});

describe('splitMedia — tách ảnh/tài liệu theo MIME', () => {
  it('blob preview không đuôi file vẫn nhận đúng loại nhờ MIME', () => {
    const { images, docs } = splitMedia(
      ['blob:http://localhost/uuid-1', 'blob:http://localhost/uuid-2'],
      ['image/jpeg', 'application/pdf'],
    );
    expect(images).toEqual(['blob:http://localhost/uuid-1']);
    expect(docs).toEqual(['blob:http://localhost/uuid-2']);
  });

  it('thiếu MIME thì đoán bằng đuôi URL, bỏ chuỗi rỗng', () => {
    const { images, docs } = splitMedia(['https://x/a.png', '', 'https://x/b.pdf']);
    expect(images).toEqual(['https://x/a.png']);
    expect(docs).toEqual(['https://x/b.pdf']);
  });
});
