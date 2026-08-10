import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Store } from '@/src/types';

interface AttendanceFlowContextValue {
  selectedStore: Store | null;
  setSelectedStore: (store: Store | null) => void;
  photoUri: string | null;
  setPhotoUri: (uri: string | null) => void;
  resetFlow: () => void;
}

const AttendanceFlowContext = createContext<
  AttendanceFlowContextValue | undefined
>(undefined);

export function AttendanceFlowProvider({ children }: { children: ReactNode }) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const resetFlow = () => {
    setSelectedStore(null);
    setPhotoUri(null);
  };

  return (
    <AttendanceFlowContext.Provider
      value={{
        selectedStore,
        setSelectedStore,
        photoUri,
        setPhotoUri,
        resetFlow,
      }}
    >
      {children}
    </AttendanceFlowContext.Provider>
  );
}

export function useAttendanceFlow() {
  const context = useContext(AttendanceFlowContext);
  if (!context) {
    throw new Error(
      'useAttendanceFlow must be used within AttendanceFlowProvider'
    );
  }
  return context;
}
