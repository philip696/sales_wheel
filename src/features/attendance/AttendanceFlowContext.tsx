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
  /*
   * Currently selected store.
   */
  selectedStore: Store | null;

  setSelectedStore: (
    store: Store | null
  ) => void;

  /*
   * Fresh camera photo used for attendance.
   */
  photoUri: string | null;

  setPhotoUri: (
    uri: string | null
  ) => void;

  /*
   * Result returned by the attendance submission.
   */
  lastSubmission: SubmitAttendanceResult | null;

  setLastSubmission: (
    result: SubmitAttendanceResult | null
  ) => void;

  /*
   * Whether the sales representative placed
   * an order during this visit.
   *
   * null  = not answered yet
   * true  = ORDER YES
   * false = ORDER NO
   */
  orderPlaced: boolean | null;

  setOrderPlaced: (
    placed: boolean
  ) => void;

  /*
   * Result returned by the Spin Wheel.
   */
  lastSpin: RequestSpinResult | null;

  setLastSpin: (
    result: RequestSpinResult | null
  ) => void;

  /*
   * Frontend state used to hide/disable the
   * Spin Wheel after it has already been used.
   */
  spinCompleted: boolean;

  setSpinCompleted: (
    completed: boolean
  ) => void;

  /*
   * Reset the complete attendance flow.
   */
  resetFlow: () => void;
}

const AttendanceFlowContext =
  createContext<
    AttendanceFlowContextValue | undefined
  >(undefined);

export function AttendanceFlowProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    selectedStore,
    setSelectedStoreState,
  ] = useState<Store | null>(null);

  const [
    photoUri,
    setPhotoUri,
  ] = useState<string | null>(null);

  const [
    lastSubmission,
    setLastSubmission,
  ] =
    useState<SubmitAttendanceResult | null>(
      null
    );

  const [
    orderPlaced,
    setOrderPlaced,
  ] = useState<boolean | null>(null);

  const [
    lastSpin,
    setLastSpin,
  ] =
    useState<RequestSpinResult | null>(
      null
    );

  const [
    spinCompleted,
    setSpinCompleted,
  ] = useState(false);

  /*
   * Selecting another store starts a completely
   * new visit flow.
   */
  const setSelectedStore = (
    store: Store | null
  ) => {
    setSelectedStoreState(store);

    if (store) {
      /*
       * Clear anything from the previous visit.
       */
      setPhotoUri(null);
      setLastSubmission(null);
      setOrderPlaced(null);
      setLastSpin(null);
      setSpinCompleted(false);
    }
  };

  /*
   * Reset the entire flow.
   *
   * Used when:
   *
   * - Sales chooses ORDER NO
   * - Sales finishes a visit
   * - Sales signs out
   * - A completely new attendance starts
   */
  const resetFlow = () => {
    setSelectedStoreState(null);
    setPhotoUri(null);
    setLastSubmission(null);
    setOrderPlaced(null);
    setLastSpin(null);
    setSpinCompleted(false);
  };

  return (
    <AttendanceFlowContext.Provider
      value={{
        /*
         * Store
         */
        selectedStore,
        setSelectedStore,

        /*
         * Attendance photo
         */
        photoUri,
        setPhotoUri,

        /*
         * Attendance result
         */
        lastSubmission,
        setLastSubmission,

        /*
         * Order decision
         */
        orderPlaced,
        setOrderPlaced,

        /*
         * Spin result
         */
        lastSpin,
        setLastSpin,

        /*
         * Spin completion
         */
        spinCompleted,
        setSpinCompleted,

        /*
         * Reset
         */
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