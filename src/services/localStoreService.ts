import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Store } from '@/src/types';

const STORAGE_KEY =
  'sales_wheel_local_stores';

export type LocalStoreDetails = {
  phone_number: string;
  owner_name: string;
  usual_order: string;
  notes: string;
};

export type LocalStore =
  Store &
  LocalStoreDetails;

const EMPTY_DETAILS: LocalStoreDetails = {
  phone_number: '',
  owner_name: '',
  usual_order: '',
  notes: '',
};

/*
 * ============================================================
 * GET ALL STORES
 * ============================================================
 */

export async function getLocalStores(): Promise<
  LocalStore[]
> {
  try {
    const raw =
      await AsyncStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as LocalStore[];
  } catch (error) {
    console.error(
      'GET LOCAL STORES ERROR:',
      error
    );

    return [];
  }
}

/*
 * ============================================================
 * SAVE ALL STORES
 * ============================================================
 */

async function saveLocalStores(
  stores: LocalStore[]
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(stores)
  );
}

/*
 * ============================================================
 * CREATE
 * ============================================================
 */

export async function createLocalStore(
  input: StoreInputWithoutDetails
): Promise<LocalStore> {
  const stores =
    await getLocalStores();

  /*
   * Prevent duplicate store codes.
   */

  const duplicate =
    stores.find(
      (store) =>
        store.store_code
          .trim()
          .toLowerCase() ===
        input.store_code
          .trim()
          .toLowerCase()
    );

  if (duplicate) {
    throw new Error(
      `Store code "${input.store_code}" is already in use.`
    );
  }

  const now =
    new Date().toISOString();

  const newStore: LocalStore = {
    id:
      `local-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`,

    store_code:
      input.store_code.trim(),

    name:
      input.name.trim(),

    address:
      input.address?.trim() ?? null,

    latitude:
      input.latitude,

    longitude:
      input.longitude,

    radius_meters:
      input.radius_meters,

    status:
      input.status,

    created_at: now,

    phone_number:
      EMPTY_DETAILS.phone_number,

    owner_name:
      EMPTY_DETAILS.owner_name,

    usual_order:
      EMPTY_DETAILS.usual_order,

    notes:
      EMPTY_DETAILS.notes,
  };

  stores.push(newStore);

  await saveLocalStores(stores);

  return newStore;
}

/*
 * ============================================================
 * GET ONE
 * ============================================================
 */

export async function getLocalStore(
  storeId: string
): Promise<LocalStore | null> {
  const stores =
    await getLocalStores();

  return (
    stores.find(
      (store) =>
        store.id === storeId
    ) ?? null
  );
}

/*
 * ============================================================
 * UPDATE DETAILS
 * ============================================================
 */

export async function updateLocalStoreDetails(
  storeId: string,
  details: LocalStoreDetails
): Promise<LocalStore> {
  const stores =
    await getLocalStores();

  const index =
    stores.findIndex(
      (store) =>
        store.id === storeId
    );

  if (index === -1) {
    throw new Error(
      'Store could not be found.'
    );
  }

  const updatedStore: LocalStore = {
    ...stores[index],

    phone_number:
      details.phone_number.trim(),

    owner_name:
      details.owner_name.trim(),

    usual_order:
      details.usual_order.trim(),

    notes:
      details.notes.trim(),

    updated_at:
      new Date().toISOString(),
  };

  stores[index] =
    updatedStore;

  await saveLocalStores(
    stores
  );

  return updatedStore;
}

/*
 * ============================================================
 * SEARCH
 * ============================================================
 */

export async function searchLocalStores(
  query = ''
): Promise<LocalStore[]> {
  const stores =
    await getLocalStores();

  const normalized =
    query.trim().toLowerCase();

  if (!normalized) {
    return stores;
  }

  return stores.filter(
    (store) =>
      store.name
        ?.toLowerCase()
        .includes(normalized) ||
      store.store_code
        ?.toLowerCase()
        .includes(normalized) ||
      store.address
        ?.toLowerCase()
        .includes(normalized)
  );
}

/*
 * ============================================================
 * TYPE
 * ============================================================
 */

export type StoreInputWithoutDetails = {
  store_code: string;
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  status:
    | 'active'
    | 'inactive';
};