import { useEffect, useState } from 'react';
import { DEFAULT_SEMESTERS } from '@/firebase';
import { AdminProvider, useAdmin, type AdminTab } from './context/AdminContext';
import { AdminLayout } from './components/AdminLayout';
import { AdminWelcome } from './components/AdminWelcome';
import { RoomManager } from './components/RoomManager';
import { ActivityManagementTab } from './components/ActivityManagementTab';
import { CentralizedStatisticsTab } from './components/CentralizedStatisticsTab';
import { DrlManagementTab } from './components/DrlManagementTab';
import { SemesterConfigTab } from './components/SemesterConfigTab';
import { StudentDetailModal } from './components/StudentDetailModal';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { usePageTracking } from '@/hooks/usePageTracking';

function AdminInner({ initialTab }: { initialTab: AdminTab }) {
  const { semester, studentModal, closeStudentModal, setActiveTab } = useAdmin();
  const [tab, setTab] = useState<AdminTab>(initialTab);
  usePageTracking('admin');

  useEffect(() => {
    setTab(initialTab);
    setActiveTab(initialTab);
  }, [initialTab, setActiveTab]);

  return (
    <AdminLayout>
      <ErrorBoundary>
        {tab === 'welcome' && <AdminWelcome />}
        {tab === 'rooms' && <RoomManager semester={semester} />}
        {tab === 'queue' && <ActivityManagementTab />}
        {tab === 'statistics' && <CentralizedStatisticsTab />}
        {tab === 'drl' && <DrlManagementTab />}
        {tab === 'semesters' && <SemesterConfigTab />}
      </ErrorBoundary>
      <StudentDetailModal
        email={studentModal?.email ?? null}
        semester={studentModal?.semester ?? semester}
        onClose={closeStudentModal}
      />
    </AdminLayout>
  );
}

export function AdminView({ initialTab = 'welcome' }: { initialTab?: AdminTab }) {
  return (
    <AdminProvider initialSemester={DEFAULT_SEMESTERS[0]}>
      <AdminInner initialTab={initialTab} />
    </AdminProvider>
  );
}
