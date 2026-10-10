import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox, CheckCircle, Clock, XCircle } from 'lucide-react';
import { SEMESTERS } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useUserActivities } from './hooks/useUserActivities';
import { useActivityFiltering } from './hooks/useActivityFiltering';
import { useExportActivities } from './hooks/useExportActivities';
import { ProfileHeader } from './components/ProfileHeader';
import { ScoreSummary } from './components/ScoreSummary';
import { ActivityHistory } from './components/ActivityHistory';
import { cn } from '@/utils/cn';

export function ProfileView() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [semester, setSemester] = useState<string>(SEMESTERS[0]);
  usePageTracking('profile');

  const {
    userData,
    loading,
    error,
    totalActivities,
    totalBonusPoints,
    finalScore,
    conditionalScore,
    metConditions,
    approvedCount,
    fetchUserActivities,
  } = useUserActivities(currentUser, semester);

  const { searchTerm, setSearchTerm, filterStatus, setFilterStatus, sortBy, setSortBy, filteredUserData, counts } =
    useActivityFiltering(userData);

  const { isExporting, exportProgress, handleExportToZip } = useExportActivities(currentUser, semester);

  if (!currentUser) {
    return <div className="text-center mt-12 text-[#707579] font-medium">Vui lòng đăng nhập để xem hồ sơ.</div>;
  }

  const tabs = [
    { id: 'all' as const, label: 'Tất cả', icon: Inbox },
    { id: 'approved' as const, label: 'Đã duyệt', icon: CheckCircle },
    { id: 'pending' as const, label: 'Đang chờ', icon: Clock },
    { id: 'rejected' as const, label: 'Từ chối', icon: XCircle },
  ];

  return (
    <div className="min-h-screen bg-[#e7ebf0] dark:bg-[#0e1621]">
      <div className="max-w-2xl mx-auto p-4 md:p-6 pb-24 md:pb-8 space-y-4">
        <button
          onClick={() => navigate('/rooms')}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-[#707579] dark:text-[#9aa0a6] hover:text-[#3390ec] transition-colors"
        >
          <ArrowLeft size={16} />
          Quay lại phòng
        </button>

        <div className="bg-white dark:bg-[#212121] rounded-2xl p-5 border border-black/5 dark:border-white/10">
          <ProfileHeader user={currentUser} />
        </div>

        <ScoreSummary
          finalScore={finalScore}
          conditionalScore={conditionalScore}
          totalBonusPoints={totalBonusPoints}
          approvedCount={approvedCount}
          totalActivities={totalActivities}
          metConditions={metConditions}
          loading={loading}
          semester={semester}
        />

        <div
          className="flex gap-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
          style={{
            WebkitMaskImage:
              'linear-gradient(to right, transparent 4px, black 24px, black calc(100% - 24px), transparent calc(100% - 4px))',
            maskImage:
              'linear-gradient(to right, transparent 4px, black 24px, black calc(100% - 24px), transparent calc(100% - 4px))',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap',
                filterStatus === tab.id
                  ? 'bg-[#3390ec] text-white'
                  : 'bg-white dark:bg-[#212121] text-[#707579] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 border border-black/5 dark:border-white/10',
              )}
            >
              <tab.icon size={14} />
              <span>
                {tab.label}
                {tab.id === 'all' && ` (${counts.all})`}
                {tab.id === 'approved' && ` (${counts.approved})`}
                {tab.id === 'pending' && ` (${counts.pending})`}
                {tab.id === 'rejected' && ` (${counts.rejected})`}
              </span>
            </button>
          ))}
        </div>

        <ActivityHistory
          semester={semester}
          setSemester={setSemester}
          loading={loading}
          error={error}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortBy={sortBy}
          setSortBy={setSortBy}
          filteredUserData={filteredUserData}
          isExporting={isExporting}
          exportProgress={exportProgress}
          onExportZip={handleExportToZip}
          fetchUserActivities={fetchUserActivities}
        />
      </div>
    </div>
  );
}
