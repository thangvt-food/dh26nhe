import { useAuth } from '@/contexts/AuthContext';
import { useDevice } from '@/hooks/useDevice';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useRoomData } from './hooks/useRoomData';
import { useMySubmissionStatus } from './hooks/useMySubmissionStatus';
import { RoomSidebar } from './components/RoomSidebar';
import { RoomContent } from './components/RoomContent';
import { RankingWidget } from './components/RankingWidget';

export function RoomView() {
  const { currentUser } = useAuth();
  const { isMobile } = useDevice();
  const {
    semester,
    semesters,
    rooms,
    roomsLoading,
    selectedRoomId,
    selectedRoom,
    selectSemester,
    selectRoom,
    goBackToRooms,
  } = useRoomData();
  usePageTracking('rooms');

  const submissionStatuses = useMySubmissionStatus(currentUser?.email, semester);

  const showContent = selectedRoom !== null;
  const showSidebar = !isMobile || !showContent;

  return (
    <div className="h-[100dvh] flex bg-[#e7ebf0] dark:bg-[#0e1621] sm:pt-0">
      {showSidebar && (
        <aside
          className={
            isMobile
              ? 'w-full h-full border-r border-black/5 dark:border-white/10'
              : 'w-72 lg:w-80 shrink-0 h-full border-r border-black/5 dark:border-white/10'
          }
        >
          <RoomSidebar
            semester={semester}
            semesters={semesters}
            onSemesterChange={selectSemester}
            activities={rooms}
            selectedRoomId={selectedRoomId}
            onSelectRoom={selectRoom}
            loading={roomsLoading}
            submissionStatuses={submissionStatuses}
            isMobile={isMobile}
          />
        </aside>
      )}

      <main className={isMobile ? (showContent ? 'w-full h-full' : 'hidden') : 'flex-1 min-w-0 h-full'}>
        {selectedRoom ? (
          <RoomContent
            semester={semester}
            activity={selectedRoom}
            onBack={goBackToRooms}
            showBack={isMobile}
          />
        ) : isMobile ? (
          <div className="flex flex-col items-center justify-center h-full text-[#707579] dark:text-[#9aa0a6] gap-3 px-4">
            <p className="text-[13px] font-medium">Chọn một phòng để bắt đầu</p>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="text-4xl opacity-20">🏠</div>
            <p className="text-[13px] font-medium text-[#707579] dark:text-[#9aa0a6] mt-3">
              Chọn một phòng từ sidebar để bắt đầu
            </p>
            <p className="text-[11px] text-[#707579]/60 dark:text-[#9aa0a6]/60 mt-1">
              Mỗi hoạt động là một phòng riêng biệt
            </p>
          </div>
        )}
      </main>

      <RankingWidget semester={semester} />
    </div>
  );
}
