import { describe, expect, it } from 'vitest';
import { getInitials, getAvatarGradient, studentIdFromEmail } from './cn';

describe('cn helpers', () => {
  it('getInitials lấy 2 chữ cái đầu/cuối', () => {
    expect(getInitials('Nguyễn Văn A')).toBe('NA');
    expect(getInitials('Admin')).toBe('AD');
    expect(getInitials('')).toBe('?');
  });

  it('getAvatarGradient ổn định với cùng input', () => {
    expect(getAvatarGradient('a@x.com')).toBe(getAvatarGradient('a@x.com'));
    expect(typeof getAvatarGradient('b@x.com')).toBe('string');
  });

  it('studentIdFromEmail tách prefix email', () => {
    expect(studentIdFromEmail('26129001@st.hcmuaf.edu.vn')).toBe('26129001');
  });
});
