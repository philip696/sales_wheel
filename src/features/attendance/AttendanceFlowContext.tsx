import type {
  RequestSpinResult,
  Store,
  SubmitAttendanceResult,
} from '@/src/types';
import { createContext, useContext, useState, type ReactNode } from 'react';

interface AttendanceFlowContextValue {
  selectedStore: Store | null;
  setSelectedStore: (store: Store | null) => void;
  photoUri: string | null;
  setPhotoUri: (uri: string | null) => void;
  lastSubmission: SubmitAttendanceResult | null;
  setLastSubmission: (result: SubmitAttendanceResult | null) => void;
  lastSpin: RequestSpinResult | null;
  setLastSpin: (result: RequestSpinResult | null) => void;
  resetFlow: () => void;
}

const AttendanceFlowContext = createContext<
  AttendanceFlowContextValue | undefined
>(undefined);

export function AttendanceFlowProvider({ children }: { children: ReactNode }) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] =
    useState<SubmitAttendanceResult | null>(null);
  const [lastSpin, setLastSpin] = useState<RequestSpinResult | null>(null);

  const resetFlow = () => {
    setSelectedStore(null);
    setPhotoUri(null);
    setLastSubmission(null);
    setLastSpin(null);
  };

  return (
    <AttendanceFlowContext.Provider
      value={{
        selectedStore,
        setSelectedStore,
        photoUri,
        setPhotoUri,
        lastSubmission,
        setLastSubmission,
        lastSpin,
        setLastSpin,
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