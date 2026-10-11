import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { roomService } from '@/services/submissionService';
import { APP_CONFIG } from '@/firebase';
import { useSemesters } from '@/hooks/useSemesters';
import type { RoomDefinition } from '@/types/submission.types';

export function useRoomData() {
  const params = useParams<{ semester?: string; roomId?: string }>();
  const navigate = useNavigate();
  const semesters = useSemesters();

  const semester = useMemo(() => {
    // Link trực tiếp /rooms/:semester vẫn hoạt động kể cả khi học kỳ không có trong list
    if (params.semester) return params.semester;
    if (semesters.includes(APP_CONFIG.defaultSemester)) return APP_CONFIG.defaultSemester;
    return semesters[0] ?? APP_CONFIG.defaultSemester;
  }, [params.semester, semesters]);

  const [rooms, setRooms] = useState<RoomDefinition[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  useEffect(() => {
    setRoomsLoading(true);
    const unsub = roomService.subscribeRooms(semester, (data) => {
      setRooms(data);
      setRoomsLoading(false);
    });
    return unsub;
  }, [semester]);

  const selectedRoomId = params.roomId ?? null;
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  const selectSemester = (next: string) => {
    navigate('/rooms/' + next);
  };

  const selectRoom = (roomId: string) => {
    navigate(`/rooms/${semester}/${roomId}`);
  };

  const goBackToRooms = () => {
    navigate(`/rooms/${semester}`);
  };

  return {
    semester,
    semesters,
    rooms,
    roomsLoading,
    selectedRoomId,
    selectedRoom,
    selectSemester,
    selectRoom,
    goBackToRooms,
  };
}
