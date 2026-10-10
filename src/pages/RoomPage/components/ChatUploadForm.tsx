import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Paperclip,
  Send,
  Loader2,
  X,
  FileText,
  AlertCircle,
  Image as ImageIcon,
  Camera,
  FolderOpen,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 10;

interface FileEntry {
  file: File;
  previewUrl: string;
}

interface Props {
  onUpload: (args: { files: File[]; previewUrls: string[]; fileTypes: string[]; description: string }) => Promise<void>;
  uploading: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

export function ChatUploadForm({ onUpload, uploading, disabled, disabledReason }: Props) {
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [modalDragOver, setModalDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      urlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const validateFile = (f: File): string | null => {
    if (!ALLOWED_TYPES.includes(f.type)) return 'Định dạng không hỗ trợ. Chỉ nhận PDF, JPG, PNG, WEBP, DOCX.';
    if (f.size > MAX_SIZE) return 'Dung lượng quá lớn. Tối đa 10MB.';
    return null;
  };

  const addFiles = useCallback(
    (selectedFiles: File[]) => {
      if (!selectedFiles || selectedFiles.length === 0) return;
      setError('');
      if (fileEntries.length + selectedFiles.length > MAX_FILES) {
        setError(`Chỉ được chọn tối đa ${MAX_FILES} tệp cùng lúc.`);
        return;
      }
      const validFiles: File[] = [];
      const errors: string[] = [];
      selectedFiles.forEach((f) => {
        const err = validateFile(f);
        if (err) errors.push(`${f.name}: ${err}`);
        else validFiles.push(f);
      });
      if (errors.length > 0) setError(errors.join('\n'));
      if (validFiles.length > 0) {
        const newEntries = validFiles.map((f) => {
          const previewUrl = URL.createObjectURL(f);
          urlsRef.current.push(previewUrl);
          return { file: f, previewUrl };
        });
        setFileEntries((prev) => [...prev, ...newEntries]);
      }
    },
    [fileEntries.length],
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length > 0) {
        e.preventDefault();
        addFiles(pastedFiles);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addFiles]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fileEntries.length > 0 && !sending) {
        handleClearAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileEntries.length, sending]);

  const resetInputs = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleClearAll = () => {
    fileEntries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
    urlsRef.current = [];
    setFileEntries([]);
    setDescription('');
    setError('');
    resetInputs();
  };

  const handleClearOnSend = () => {
    setFileEntries([]);
    setDescription('');
    setError('');
    resetInputs();
  };

  const handleSubmit = async () => {
    if (fileEntries.length === 0 || sending || disabled) return;
    const payload = {
      files: fileEntries.map((e) => e.file),
      previewUrls: fileEntries.map((e) => e.previewUrl),
      fileTypes: fileEntries.map((e) => e.file.type || ''),
      description,
    };
    handleClearOnSend();
    setSending(true);
    try {
      await onUpload(payload);
    } catch {
      // ChatTab đã toast lỗi.
    } finally {
      setSending(false);
    }
  };

  const handleCaptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const removeFile = (idx: number) => {
    const entry = fileEntries[idx];
    if (entry) {
      URL.revokeObjectURL(entry.previewUrl);
      urlsRef.current = urlsRef.current.filter((u) => u !== entry.previewUrl);
    }
    setFileEntries((prev) => prev.filter((_, i) => i !== idx));
    setError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setModalDragOver(false);
    addFiles(Array.from(e.dataTransfer?.files || []));
  };

  const imageEntries = fileEntries.filter((e) => e.file.type.startsWith('image/'));
  const docEntries = fileEntries.filter((e) => !e.file.type.startsWith('image/'));

  const modalTitle = () => {
    const total = fileEntries.length;
    if (total === 0) return '';
    if (docEntries.length === 0) return total === 1 ? 'Gửi 1 ảnh' : `Gửi ${total} ảnh`;
    if (imageEntries.length === 0) return total === 1 ? 'Gửi 1 tệp tin' : `Gửi ${total} tệp tin`;
    return `Gửi ${total} tệp đã chọn`;
  };

  const openPicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    setPickerOpen(false);
    ref.current?.click();
  };

  return (
    <>
      {/* ── Attachment Modal (Portal to body) ── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {fileEntries.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setModalDragOver(true);
                }}
                onDragLeave={() => setModalDragOver(false)}
              >
                <div className="absolute inset-0" onClick={handleClearAll} />

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 12, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    'relative z-10 w-full max-w-[460px] max-h-[88vh] sm:max-h-[85vh] rounded-[2rem] bg-white dark:bg-[#212121] shadow-2xl flex flex-col overflow-hidden border border-black/5 dark:border-white/10',
                    modalDragOver && 'ring-2 ring-[#3390ec]',
                  )}
                >
                  <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-black/5 dark:border-white/5 shrink-0">
                    <button
                      onClick={handleClearAll}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#707579] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors"
                      aria-label="Đóng"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h3 className="text-[16px] font-semibold text-black dark:text-white tracking-tight">
                      {modalTitle()}
                    </h3>
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={sending || fileEntries.length >= MAX_FILES}
                      className="flex items-center gap-1 text-[13px] font-medium text-[#3390ec] hover:text-[#2883df] px-2.5 py-1 rounded-full hover:bg-[#3390ec]/10 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Plus className="w-4 h-4" strokeWidth={2.5} />
                      <span>Thêm</span>
                    </button>
                  </div>

                  {error && (
                    <div className="mx-4 mt-2 p-2.5 rounded-xl bg-[#e53935]/10 border border-[#e53935]/20 flex items-start gap-2 text-[12px] text-[#e53935]">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="whitespace-pre-line">{error}</span>
                    </div>
                  )}

                  <div className="overflow-y-auto flex-1 min-h-0 px-4 py-3 scrollbar-thin flex flex-col gap-2.5">
                    {imageEntries.length === 1 && docEntries.length === 0 && (
                      <div className="relative rounded-2xl overflow-hidden bg-black/5 dark:bg-black/30 border border-black/5 dark:border-white/5 flex items-center justify-center min-h-[160px] max-h-[320px] group">
                        <img
                          src={imageEntries[0].previewUrl}
                          alt={imageEntries[0].file.name}
                          className="w-full max-h-[320px] object-contain rounded-2xl"
                        />
                        {!sending && (
                          <button
                            onClick={() => removeFile(fileEntries.indexOf(imageEntries[0]))}
                            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md shadow-md transition-all active:scale-90"
                            aria-label="Xoá ảnh"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}

                    {imageEntries.length > 1 && (
                      <div className="grid grid-cols-2 gap-2">
                        {imageEntries.map((entry) => {
                          const globalIdx = fileEntries.indexOf(entry);
                          return (
                            <div
                              key={entry.previewUrl}
                              className="relative aspect-square rounded-2xl overflow-hidden bg-black/5 dark:bg-black/30 border border-black/5 dark:border-white/5 group shadow-sm"
                            >
                              <img
                                src={entry.previewUrl}
                                alt={entry.file.name}
                                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              {!sending && (
                                <button
                                  onClick={() => removeFile(globalIdx)}
                                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-[#e53935] text-white flex items-center justify-center backdrop-blur-md shadow-md transition-all active:scale-90"
                                  aria-label={`Xoá ${entry.file.name}`}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              <span className="absolute bottom-1.5 left-2 text-[10px] text-white/90 font-medium truncate max-w-[80%] drop-shadow-sm">
                                {(entry.file.size / 1024 / 1024).toFixed(1)} MB
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {docEntries.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {docEntries.map((entry) => {
                          const globalIdx = fileEntries.indexOf(entry);
                          const ext = entry.file.name.split('.').pop()?.toUpperCase();
                          const isPdf = ext === 'PDF';
                          return (
                            <div
                              key={entry.previewUrl}
                              className="flex items-center gap-3 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5"
                            >
                              <div
                                className={cn(
                                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-[11px]',
                                  isPdf ? 'bg-[#e53935]/15 text-[#e53935]' : 'bg-[#3390ec]/15 text-[#3390ec]',
                                )}
                              >
                                {isPdf ? 'PDF' : <FileText className="w-5 h-5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium text-black dark:text-white truncate">
                                  {entry.file.name}
                                </p>
                                <p className="text-[11px] text-[#707579] dark:text-[#9aa0a6]">
                                  {(entry.file.size / 1024 / 1024).toFixed(2)} MB · {ext}
                                </p>
                              </div>
                              {!sending && (
                                <button
                                  onClick={() => removeFile(globalIdx)}
                                  className="w-7 h-7 rounded-full text-[#707579] hover:text-[#e53935] hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
                                  aria-label={`Xoá ${entry.file.name}`}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="p-3 pt-2 shrink-0">
                    <div className="rounded-2xl bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 focus-within:border-[#3390ec]/40 focus-within:ring-2 focus-within:ring-[#3390ec]/10 transition-all p-2 flex flex-col gap-2">
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onKeyDown={handleCaptionKeyDown}
                        placeholder="Thêm mô tả (không bắt buộc)..."
                        rows={2}
                        className="w-full text-[13.5px] bg-transparent resize-none border-0 p-1 outline-none text-black dark:text-white placeholder:text-[#707579] max-h-24 min-h-[44px]"
                        disabled={sending}
                      />
                      <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
                        <span className="text-[11px] font-medium text-[#707579] dark:text-[#9aa0a6]">
                          {fileEntries.length} tệp đã chọn
                        </span>
                        <button
                          onClick={handleSubmit}
                          className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-[#3390ec] text-white font-medium text-[13px] shadow-sm hover:bg-[#2883df] active:scale-95 transition-all cursor-pointer"
                        >
                          <Send className="w-4 h-4 ml-0.5" />
                          <span>Gửi {fileEntries.length > 1 ? `(${fileEntries.length})` : ''}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* ── Chat Composer Bottom Bar ── */}
      <div
        className={cn(
          'w-full bg-transparent pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 px-3 sm:px-4 shrink-0 z-20 transition-all',
          dragOver && 'bg-[#3390ec]/15 backdrop-blur-md',
        )}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
      >
        {dragOver && (
          <div className="max-w-2xl mx-auto mb-2 px-4 py-2 text-center text-[12.5px] font-semibold text-[#3390ec] bg-[#3390ec]/15 backdrop-blur-md rounded-full flex items-center justify-center gap-2 shadow-sm">
            <ImageIcon className="w-4 h-4" />
            <span>Thả tệp vào đây để tải lên minh chứng</span>
          </div>
        )}

        <div className="max-w-3xl mx-auto flex items-center gap-2 sm:gap-2.5">
          <div className="flex-1 min-w-0 flex items-center bg-white/80 dark:bg-[#212121]/80 backdrop-blur-xl rounded-[24px] shadow border border-black/10 dark:border-white/10 hover:border-black/15 px-1.5 py-1 transition-all duration-200 focus-within:border-[#3390ec]/50 focus-within:ring-2 focus-within:ring-[#3390ec]/20">
            <div className="relative shrink-0" ref={pickerRef}>
              <button
                onClick={() => setPickerOpen((o) => !o)}
                disabled={disabled}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-150 shrink-0 active:scale-95 cursor-pointer disabled:opacity-50',
                  pickerOpen
                    ? 'bg-[#3390ec]/15 text-[#3390ec]'
                    : 'text-[#707579] dark:text-[#aaaaaa] hover:text-[#3390ec] hover:bg-black/5 dark:hover:bg-white/10',
                )}
                aria-label="Đính kèm minh chứng"
                title={disabled ? disabledReason : 'Đính kèm ảnh hoặc tài liệu'}
              >
                <Paperclip className="h-5 w-5" />
              </button>

              <AnimatePresence>
                {pickerOpen && !disabled && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96, transition: { duration: 0.1 } }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    style={{ transformOrigin: 'bottom left' }}
                    className="absolute bottom-full left-0 mb-3 z-40 min-w-[240px] bg-white/90 dark:bg-[#212121]/90 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 select-none"
                  >
                    <button
                      onClick={() => openPicker(imageInputRef)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#3390ec]/15 text-[#3390ec] flex items-center justify-center shrink-0">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium text-black dark:text-white leading-tight">
                          Ảnh minh chứng
                        </p>
                        <p className="text-[11px] text-[#707579] dark:text-[#9aa0a6] mt-0.5">
                          JPG, PNG tối đa 10MB
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => openPicker(cameraInputRef)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#f5a623]/15 text-[#f5a623] flex items-center justify-center shrink-0">
                        <Camera className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium text-black dark:text-white leading-tight">
                          Chụp ảnh
                        </p>
                        <p className="text-[11px] text-[#707579] dark:text-[#9aa0a6] mt-0.5">
                          Dùng camera điện thoại
                        </p>
                      </div>
                    </button>
                    <div className="mx-2 my-1 border-t border-black/5 dark:border-white/10" />
                    <button
                      onClick={() => openPicker(fileInputRef)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-violet-500/15 text-violet-500 flex items-center justify-center shrink-0">
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium text-black dark:text-white leading-tight">
                          Tệp tin / Tài liệu
                        </p>
                        <p className="text-[11px] text-[#707579] dark:text-[#9aa0a6] mt-0.5">
                          PDF, DOCX tài liệu
                        </p>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div
              onClick={() => !disabled && openPicker(imageInputRef)}
              className="flex-1 min-w-0 px-2 py-2 text-left cursor-pointer select-none group"
              role="button"
              tabIndex={0}
              title={disabled ? disabledReason : undefined}
            >
              <span className="text-[13.5px] sm:text-[14px] text-[#707579] dark:text-[#9aa0a6] group-hover:text-black dark:group-hover:text-white transition-colors truncate block">
                {disabled ? (disabledReason ?? 'Không thể nộp lúc này') : 'Gửi ảnh hoặc tệp minh chứng...'}
              </span>
            </div>

            <div className="flex items-center gap-0.5 shrink-0 pr-1">
              <button
                onClick={() => openPicker(imageInputRef)}
                disabled={disabled}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#707579] dark:text-[#aaaaaa] hover:text-[#3390ec] hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer disabled:opacity-40"
                title="Chọn ảnh từ thư viện"
                aria-label="Chọn ảnh"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => openPicker(cameraInputRef)}
                disabled={disabled}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#707579] dark:text-[#aaaaaa] hover:text-[#3390ec] hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer disabled:opacity-40"
                title="Chụp ảnh mới"
                aria-label="Chụp ảnh"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files || []));
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            multiple
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files || []));
              setPickerOpen(false);
              if (imageInputRef.current) imageInputRef.current.value = '';
            }}
            multiple
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files || []));
              setPickerOpen(false);
              if (cameraInputRef.current) cameraInputRef.current.value = '';
            }}
          />

          <button
            onClick={() => openPicker(imageInputRef)}
            disabled={disabled}
            className="flex items-center justify-center w-[46px] h-[46px] rounded-full transition-all duration-150 shrink-0 active:scale-90 bg-[#3390ec] hover:bg-[#2883df] text-white shadow disabled:opacity-60 cursor-pointer"
            aria-label="Tải lên minh chứng"
            title={disabled ? disabledReason : 'Chọn ảnh hoặc tệp để tải lên'}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5 -ml-0.5 mt-0.5" strokeWidth={2.2} />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
