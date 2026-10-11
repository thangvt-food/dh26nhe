import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Images, Layers, Link2, CalendarDays, Award, ShieldAlert } from 'lucide-react';
import { get as rtdbGet, ref as rtdbRef, set as rtdbSet } from 'firebase/database';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useSemesters } from '@/hooks/useSemesters';
import { useGallery } from './hooks/useGallery';
import { FloatingHomeButton } from '@/components/shared/FloatingHomeButton';
import { TelegramMediaViewer } from '@/components/shared/TelegramMediaViewer';
import { rtdb } from '@/firebase';
import { getAvatarGradient, getInitials, studentIdFromEmail, cn } from '@/utils/cn';

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** Ảnh có skeleton + fade-in khi tải xong (lazy load). */
function FeedImage({ url, alt, onClick }: { url: string; alt: string; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative rounded-2xl overflow-hidden bg-black/[0.06] dark:bg-white/[0.06] aspect-[4/3] sm:aspect-[16/9]">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-black/[0.08] to-black/[0.03] dark:from-white/[0.08] dark:to-white/[0.03]" />
      )}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onClick={onClick}
        className={cn(
          'w-full h-full object-cover cursor-zoom-in transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10 p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-1/3 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
          <div className="h-2.5 w-1/4 rounded bg-black/5 dark:bg-white/5 animate-pulse" />
        </div>
        <div className="h-6 w-14 rounded-full bg-black/10 dark:bg-white/10 animate-pulse" />
      </div>
      <div className="h-4 w-2/3 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
      <div className="rounded-xl bg-black/5 dark:bg-white/5 aspect-[16/9] animate-pulse" />
    </div>
  );
}

export function GalleryOwnView() {
  const { currentUser } = useAuth();
  const semesters = useSemesters();
  usePageTracking('gallery');

  const [mySlug, setMySlug] = useState<string | null>(null);
  const [slugError, setSlugError] = useState(false);
  const [copied, setCopied] = useState(false);

  // Lấy/tự cấp slug phòng trưng bày riêng (RTDB userGallery/{uid} → galleryLinks/{slug})
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      const uid = currentUser.uid;
      try {
        const snap = await rtdbGet(rtdbRef(rtdb, `userGallery/${uid}`));
        const existing = snap.val() as { slug?: string } | null;
        if (existing?.slug) {
          if (!cancelled) setMySlug(existing.slug);
          return;
        }
        const slug = crypto.randomUUID();
        const email = currentUser.email ?? '';
        await rtdbSet(rtdbRef(rtdb, `galleryLinks/${slug}`), {
          email,
          fullName: currentUser.displayName ?? '',
          createdAt: Date.now(),
        });
        await rtdbSet(rtdbRef(rtdb, `userGallery/${uid}`), { slug, email });
        if (!cancelled) setMySlug(slug);
      } catch {
        if (!cancelled) setSlugError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const shareUrl = mySlug ? `${window.location.origin}/g/${mySlug}` : '';

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <GalleryContent
      email={currentUser?.email ?? null}
      headerExtra={
        <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10">
          {slugError ? (
            <p className="text-[12px] text-[#e53935] flex items-center gap-1.5">
              <ShieldAlert size={14} /> Không tạo được link chia sẻ. Vui lòng thử lại sau.
            </p>
          ) : mySlug ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10">
                <Link2 size={14} className="text-[#3390ec] shrink-0" />
                <span className="text-[12px] font-medium text-black dark:text-white truncate">{shareUrl}</span>
              </div>
              <button
                onClick={() => void copyLink()}
                className={cn(
                  'px-3.5 h-9 rounded-xl text-[12px] font-bold shrink-0 flex items-center gap-1.5 transition-colors',
                  copied ? 'bg-[#4fae4e] text-white' : 'bg-[#3390ec] hover:bg-[#2883df] text-white',
                )}
              >
                {copied ? <Check size={13} /> : <Link2 size={13} />}
                {copied ? 'Đã copy' : 'Copy link'}
              </button>
            </div>
          ) : (
            <p className="text-[12px] text-[#707579] dark:text-[#9aa0a6]">Đang chuẩn bị link chia sẻ…</p>
          )}
          <p className="text-[11px] text-[#a2acb4] mt-1.5">
            Gửi link này cho Ban Chấp hành / người thân — ai có link đều xem được, không cần đăng nhập.
          </p>
        </div>
      }
      headerBadge={null}
      loadingSlug={!mySlug && !slugError}
    />
  );
}

/** Xem phòng trưng bày công khai qua slug UUID (link riêng của sinh viên). */
export function GalleryPublicView() {
  const { slug } = useParams<{ slug: string }>();
  usePageTracking('gallery');

  const [email, setEmail] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadingSlug, setLoadingSlug] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await rtdbGet(rtdbRef(rtdb, `galleryLinks/${slug}`));
        const val = snap.val() as { email?: string } | null;
        if (cancelled) return;
        if (val?.email) setEmail(val.email);
        else setNotFound(true);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoadingSlug(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#e7ebf0] dark:bg-[#0e1621] flex items-center justify-center px-4">
        <div className="text-center bg-white dark:bg-[#212121] rounded-3xl border border-black/5 dark:border-white/10 p-8">
          <ShieldAlert size={36} className="mx-auto text-[#f5a623]" />
          <p className="text-[15px] font-bold text-black dark:text-white mt-3">Phòng trưng bày không tồn tại</p>
          <p className="text-[12.5px] text-[#707579] dark:text-[#9aa0a6] mt-1">
            Link có thể đã sai hoặc bị thu hồi. Vui lòng liên hệ sinh viên để nhận link mới.
          </p>
        </div>
      </div>
    );
  }

  return (
    <GalleryContent
      email={email}
      headerExtra={null}
      headerBadge={email ? 'Trưng bày công khai' : null}
      loadingSlug={loadingSlug}
    />
  );
}

interface GalleryContentProps {
  email: string | null;
  headerExtra: React.ReactNode;
  headerBadge: string | null;
  loadingSlug?: boolean;
}

function GalleryContent({ email, headerExtra, headerBadge, loadingSlug = false }: GalleryContentProps) {
  const semesters = useSemesters();
  const { items, total, loading, hasMore, loadMore } = useGallery(email, semesters);

  const [viewer, setViewer] = useState<{ images: string[]; index: number; title: string } | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Cuộn âm thầm: sentinel chạm đáy → nạp 10 bài kế tiếp
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore, items.length]);

  const displayName = items[0]?.fullName || email?.split('@')[0] || 'Sinh viên';
  const studentId = email ? studentIdFromEmail(email) : '';

  // Chia theo tháng để có vạch thời gian
  const rows = useMemo(() => {
    const out: Array<{ type: 'month'; label: string } | { type: 'post'; item: (typeof items)[number] }> = [];
    let lastMonth = '';
    for (const item of items) {
      const mk = monthKey(item.submittedAt);
      if (mk !== lastMonth) {
        out.push({ type: 'month', label: `Tháng ${mk}` });
        lastMonth = mk;
      }
      out.push({ type: 'post', item });
    }
    return out;
  }, [items]);

  return (
    <div className="min-h-screen bg-[#e7ebf0] dark:bg-[#0e1621] pb-28 md:pb-10">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500/15 to-orange-500/10 text-pink-500">
            <Images size={20} />
          </div>
          <h1 className="text-[18px] font-extrabold text-black dark:text-white flex-1">
            Phòng trưng bày
          </h1>
        </div>

        {/* Thẻ tổng — số hoạt động đã duyệt */}
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10 p-5 shadow-sm mb-5">
          <div aria-hidden className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-pink-500/10 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div
              className={cn(
                'w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[18px] font-bold shrink-0',
                getAvatarGradient(email ?? 'u'),
              )}
            >
              {getInitials(displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-extrabold text-black dark:text-white truncate">{displayName}</p>
              <p className="text-[12px] text-[#707579] dark:text-[#9aa0a6] font-mono truncate">{studentId}</p>
              {headerBadge && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#3390ec]/10 text-[#3390ec] text-[10.5px] font-bold">
                  {headerBadge}
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[38px] leading-none font-extrabold text-[#3390ec] dark:text-[#4fc3f7] tabular-nums">
                {loading || loadingSlug ? '—' : total}
              </p>
              <p className="text-[11px] font-semibold text-[#707579] dark:text-[#9aa0a6] mt-1 flex items-center gap-1 justify-end">
                <Layers size={12} /> hoạt động đã duyệt
              </p>
            </div>
          </div>
          {headerExtra}
        </div>

        {/* Feed */}
        {loading || loadingSlug ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : !email ? null : total === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#212121] rounded-3xl border border-black/5 dark:border-white/10">
            <Images size={36} className="mx-auto text-[#a2acb4]" />
            <p className="text-[14px] font-semibold text-black dark:text-white mt-3">Chưa có kỷ niệm nào</p>
            <p className="text-[12.5px] text-[#707579] dark:text-[#9aa0a6] mt-1">
              Các hoạt động đã được duyệt sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row, idx) =>
              row.type === 'month' ? (
                <div key={`m-${row.label}-${idx}`} className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10 shadow-sm">
                    <CalendarDays size={12} className="text-[#3390ec]" />
                    <span className="text-[11.5px] font-extrabold text-[#3390ec] uppercase tracking-wide">{row.label}</span>
                  </div>
                  <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                </div>
              ) : (
                <motion.article
                  key={row.item.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="rounded-2xl bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10 shadow-sm overflow-hidden"
                >
                  {/* Card header */}
                  <div className="flex items-center gap-2.5 p-3.5 pb-2.5">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[12px] font-bold shrink-0',
                        getAvatarGradient(email ?? 'u'),
                      )}
                    >
                      {getInitials(displayName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-black dark:text-white truncate">{displayName}</p>
                      <p className="text-[11px] text-[#707579] dark:text-[#9aa0a6] flex items-center gap-1">
                        <CalendarDays size={10} />
                        {formatDateTime(row.item.submittedAt)}
                        <span className="px-1.5 rounded bg-black/5 dark:bg-white/10 font-semibold">{row.item.semester}</span>
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-gradient-to-br from-[#fff8e1] to-[#ffecb3] dark:from-[#f5a623]/20 dark:to-[#f5a623]/10 text-[#b8860b] dark:text-[#f5a623] text-[12px] font-extrabold shrink-0">
                      <Award size={12} />+{row.item.bonusPoints}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="px-3.5 pb-3.5 space-y-2.5">
                    <h3 className="text-[14.5px] font-bold text-black dark:text-white leading-snug">
                      {row.item.activityName}
                    </h3>
                    {row.item.fileUrls.length > 0 && (
                      <div className="relative">
                        <FeedImage
                          url={row.item.fileUrls[0]}
                          alt={row.item.activityName}
                          onClick={() =>
                            setViewer({ images: row.item.fileUrls, index: 0, title: row.item.activityName })
                          }
                        />
                        {row.item.fileUrls.length > 1 && (
                          <button
                            onClick={() => setViewer({ images: row.item.fileUrls, index: 0, title: row.item.activityName })}
                            className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[11px] font-bold backdrop-blur-sm"
                          >
                            +{row.item.fileUrls.length - 1} tệp khác
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.article>
              ),
            )}

            {/* Sentinel — nạp thêm âm thầm */}
            <div ref={sentinelRef} className="h-4" />
            {hasMore ? (
              <div className="flex justify-center py-2">
                <div className="w-6 h-6 rounded-full border-2 border-[#3390ec]/20 border-t-[#3390ec] animate-spin" />
              </div>
            ) : (
              <p className="text-center text-[11.5px] text-[#707579] dark:text-[#9aa0a6] py-2">
                Bạn đã xem hết {total} hoạt động ✨
              </p>
            )}
          </div>
        )}
      </div>

      {viewer && (
        <TelegramMediaViewer
          isOpen
          images={viewer.images}
          currentIndex={viewer.index}
          title={viewer.title}
          onClose={() => setViewer(null)}
          onNavigate={(index) => setViewer((v) => (v ? { ...v, index } : v))}
        />
      )}
      <FloatingHomeButton />
    </div>
  );
}
