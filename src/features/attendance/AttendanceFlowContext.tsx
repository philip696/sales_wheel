import type {
  RequestSpinResult,
  Store,
  SubmitAttendanceResult,
} from '@/src/types';

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';

interface AttendanceFlowContextValue {
  selectedStore: Store | null;
  setSelectedStore: (store: Store | null) => void;

  photoUri: string | null;
  setPhotoUri: (uri: string | null) => void;

  lastSubmission: SubmitAttendanceResult | null;
  setLastSubmission: (
    result: SubmitAttendanceResult | null
  ) => void;

  lastSpin: RequestSpinResult | null;
  setLastSpin: (result: RequestSpinResult | null) => void;

  /*
   * The store associated with the currently
   * approved attendance.
   */
  approvedAttendanceStoreId: string | null;

  /*
   * The attendance ID that was approved.
   */
  approvedAttendanceId: string | null;

  /*
   * Set only after the backend reports
   * that the attendance is approved.
   */
  setApprovedAttendance: (
    storeId: string,
    attendanceId: string
  ) => void;

  /*
   * Remove the current approval.
   */
  clearApprovedAttendance: () => void;

  /*
   * Frontend state used to hide the wheel
   * after the user has already spun it.
   */
  spinCompleted: boolean;

  setSpinCompleted: (completed: boolean) => void;

  resetFlow: () => void;
}

const AttendanceFlowContext =
  createContext<AttendanceFlowContextValue | undefined>(
    undefined
  );

export function AttendanceFlowProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selectedStore, setSelectedStoreState] =
    useState<Store | null>(null);

  const [photoUri, setPhotoUri] =
    useState<string | null>(null);

  const [lastSubmission, setLastSubmission] =
    useState<SubmitAttendanceResult | null>(null);

  const [lastSpin, setLastSpin] =
    useState<RequestSpinResult | null>(null);

  const [approvedAttendanceStoreId, setApprovedAttendanceStoreId] =
    useState<string | null>(null);

  const [approvedAttendanceId, setApprovedAttendanceId] =
    useState<string | null>(null);

  const [spinCompleted, setSpinCompleted] =
    useState(false);

  /*
   * Selecting another store starts a new frontend flow.
   */
  const setSelectedStore = (store: Store | null) => {
    setSelectedStoreState(store);

    if (store) {
      setSpinCompleted(false);
      setLastSpin(null);

      setApprovedAttendanceStoreId(null);
      setApprovedAttendanceId(null);
    }
  };

  /*
   * Called ONLY when attendance is actually approved.
   */
  const setApprovedAttendance = (
    storeId: string,
    attendanceId: string
  ) => {
    setApprovedAttendanceStoreId(storeId);
    setApprovedAttendanceId(attendanceId);
  };

  /*
   * Remove approval.
   */
  const clearApprovedAttendance = () => {
    setApprovedAttendanceStoreId(null);
    setApprovedAttendanceId(null);
  };

  /*
   * Reset everything.
   */
  const resetFlow = () => {
    setSelectedStoreState(null);
    setPhotoUri(null);
    setLastSubmission(null);
    setLastSpin(null);

    setApprovedAttendanceStoreId(null);
    setApprovedAttendanceId(null);

    setSpinCompleted(false);
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

        approvedAttendanceStoreId,
        approvedAttendanceId,

        setApprovedAttendance,
        clearApprovedAttendance,

        spinCompleted,
        setSpinCompleted,

        resetFlow,
      }}
    >
      {children}
    </AttendanceFlowContext.Provider>
  );
}

export function useAttendanceFlow() {
  const context = useContext(
    AttendanceFlowContext
  );

  if (!context) {
    throw new Error(
      'useAttendanceFlow must be used within AttendanceFlowProvider'
    );
  }

  return context;
}