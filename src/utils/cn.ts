import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const AVATAR_GRADIENTS = [
  'from-rose-400 to-orange-400',
  'from-amber-400 to-yellow-500',
  'from-lime-400 to-emerald-500',
  'from-teal-400 to-cyan-500',
  'from-sky-400 to-blue-500',
  'from-indigo-400 to-violet-500',
  'from-purple-400 to-fuchsia-500',
  'from-pink-400 to-rose-500',
];

export function getAvatarGradient(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function studentIdFromEmail(email: string): string {
  return email.split('@')[0] ?? '';
}
