import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type AdminTab = 'welcome' | 'rooms' | 'queue' | 'statistics' | 'drl';

interface AdminContextValue {
  semester: string;
  setSemester: (s: string) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  debouncedSearchTerm: string;
  activeTab: AdminTab;
  setActiveTab: (t: AdminTab) => void;
  studentModal: { email: string; semester: string } | null;
  openStudentModal: (email: string, semester: string) => void;
  closeStudentModal: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children, initialSemester }: { children: ReactNode; initialSemester: string }) {
  const [semester, setSemesterState] = useState(initialSemester);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('welcome');
  const [studentModal, setStudentModal] = useState<{ email: string; semester: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const setSemester = (s: string) => {
    setSemesterState(s);
    setSearchTerm('');
  };

  return (
    <AdminContext.Provider
      value={{
        semester,
        setSemester,
        searchTerm,
        setSearchTerm,
        debouncedSearchTerm,
        activeTab,
        setActiveTab,
        studentModal,
        openStudentModal: (email, sem) => setStudentModal({ email, semester: sem }),
        closeStudentModal: () => setStudentModal(null),
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
