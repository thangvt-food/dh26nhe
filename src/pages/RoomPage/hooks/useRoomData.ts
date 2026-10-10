import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { roomService } from '@/services/submissionService';
import { APP_CONFIG, SEMESTERS } from '@/firebase';
import type { RoomDefinition } from '@/types/submission.types';

export function useRoomData() {
  const params = useParams<{ semester?: string; roomId?: string }>();
  const navigate = useNavigate();

  const semester = useMemo(() => {
    const s = params.semester;
    if (s && (SEMESTERS as readonly string[]).includes(s)) return s;
    return APP_CONFIG.defaultSemester;
  }, [params.semester]);

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
    rooms,
    roomsLoading,
    selectedRoomId,
    selectedRoom,
    selectSemester,
    selectRoom,
    goBackToRooms,
  };
}
