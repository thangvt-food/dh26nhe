import { memo } from 'react';

/** Nền hoa văn doodle Telegram chuẩn (port từ bản gốc). */
export const TelegramChatPattern = memo(() => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      <svg
        className="w-full h-full text-[#386b94] dark:text-[#9bbdd4] opacity-[0.14] dark:opacity-[0.08]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="telegram-doodle-pattern"
            x="0"
            y="0"
            width="200"
            height="200"
            patternUnits="userSpaceOnUse"
          >
            {/* 1. Telegram Paper Plane */}
            <path
              d="M16 14 L42 24 L22 42 L20 31 L29 26 L19 29 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* 2. Star */}
            <path
              d="M92 16 L94 23 L101 23 L95 28 L98 35 L92 31 L86 35 L89 28 L83 23 L90 23 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* 3. Speech / Chat Bubble */}
            <path
              d="M152 14 C162 14 170 20 170 28 C170 36 162 42 152 42 C148 42 144 41 141 40 L134 43 L136 37 C133 35 132 31 132 28 C132 20 140 14 152 14 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />

            {/* 4. Headphones */}
            <path
              d="M30 65 A12 12 0 0 1 54 65 v8 h-4 v-6 h4 M30 73 h-4 v-6 h4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* 5. Heart */}
            <path
              d="M92 70 C88 65 80 67 80 74 C80 81 92 90 92 90 C92 90 104 81 104 74 C104 67 96 65 92 70 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />

            {/* 6. Saturn / Planet */}
            <ellipse
              cx="156"
              cy="74"
              rx="10"
              ry="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M140 78 C146 84 166 84 172 70"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />

            {/* 7. Coffee Cup */}
            <path
              d="M22 124 h18 v12 c0 4 -4 8 -9 8 s-9 -4 -9 -8 z M40 127 h4 c2 0 3 1 3 3 s-1 3 -3 3 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* 8. Light Bulb */}
            <path
              d="M92 118 c-5 0 -8 4 -8 8 c0 3 2 6 4 7 v3 h8 v-3 c2 -1 4 -4 4 -7 c0 -4 -3 -8 -8 -8 z M90 139 h4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />

            {/* 9. Rocket */}
            <path
              d="M152 116 c5 0 12 6 14 13 c-4 2 -8 2 -11 -1 l-3 3 c-3 -3 -3 -7 -1 -11 c7 2 11 6 11 6 M146 135 l-3 5 M160 129 l4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* 10. Cat Face */}
            <path
              d="M32 168 l-4 -9 l6 3 c2 -1 5 -1 8 -1 s6 0 8 1 l6 -3 l-4 9 c2 3 2 6 2 9 c0 8 -7 12 -12 12 s-12 -4 -12 -12 c0 -3 0 -6 2 -9 z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            />

            {/* 11. Music Note */}
            <path
              d="M92 162 v16 a4 4 0 1 1 -3 -3.8 v-12.2 l14 -3 v11 a4 4 0 1 1 -3 -3.8 v-10.2 z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />

            {/* 12. Camera */}
            <path
              d="M142 166 h4 l2 -3 h8 l2 3 h4 c2 0 3 1 3 3 v12 c0 2 -1 3 -3 3 h-20 c-2 0 -3 -1 -3 -3 v-12 c0 -2 1 -3 3 -3 z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="154" cy="174" r="4" fill="none" stroke="currentColor" strokeWidth="1.4" />

            {/* 13. Gamepad */}
            <rect x="74" y="42" width="22" height="13" rx="4" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M78 48 h4 M80 46 v4 M91 47 h.01 M93 49 h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

            {/* Decorative Sparkles / Dots */}
            <circle cx="60" cy="22" r="1.6" fill="currentColor" />
            <circle cx="120" cy="58" r="1.5" fill="currentColor" />
            <circle cx="68" cy="100" r="1.6" fill="currentColor" />
            <circle cx="122" cy="98" r="1.5" fill="currentColor" />
            <circle cx="18" cy="95" r="1.6" fill="currentColor" />
            <circle cx="182" cy="148" r="1.6" fill="currentColor" />
            <circle cx="118" cy="148" r="1.5" fill="currentColor" />
            <circle cx="65" cy="155" r="1.6" fill="currentColor" />
            <circle cx="128" cy="186" r="1.4" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#telegram-doodle-pattern)" />
      </svg>
    </div>
  );
});

TelegramChatPattern.displayName = 'TelegramChatPattern';
