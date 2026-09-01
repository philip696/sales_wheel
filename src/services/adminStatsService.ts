// src/services/adminStatsService.ts

import { supabase } from '@/src/lib/supabase';

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

export interface AdminSalesPerformance {
  salesId: string;
  salesName: string;
  visits: number;
  orders: number;
  conversionRate: number;
}

export interface AdminRouteAlert {
  salesId: string;
  salesName: string;
  message: string;
  severity: 'warning' | 'info';
}

export interface AdminDashboardStats {
  salesCount: number;
  storesCount: number;

  todayVisits: number;
  todayOrders: number;
  todayRoutes: number;

  conversionRate: number;

  topSales: AdminSalesPerformance[];

  routeAlerts: AdminRouteAlert[];
}

/*
 * ============================================================
 * DATE HELPERS
 * ============================================================
 */

function getStartOfToday() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
}

function getEndOfToday() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );
}

/*
 * ============================================================
 * FORMAT DURATION
 * ============================================================
 */

function formatGap(
  milliseconds: number
): string {
  const totalMinutes = Math.floor(
    milliseconds /
      1000 /
      60
  );

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}m`;
  }

  if (minutes <= 0) {
    return `${hours}h`;
  }

  return `${hours}h ${String(
    minutes
  ).padStart(2, '0')}m`;
}

/*
 * ============================================================
 * MAIN DASHBOARD QUERY
 * ============================================================
 */

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const startOfToday =
    getStartOfToday();

  const endOfToday =
    getEndOfToday();

  const startISO =
    startOfToday.toISOString();

  const endISO =
    endOfToday.toISOString();

  /*
   * ==========================================================
   * LOAD BASIC COUNTS
   * ==========================================================
   */

  const [
    salesResult,
    storesResult,
  ] =
    await Promise.all([
      supabase
        .from('sales')
        .select(
          'id',
          {
            count:
              'exact',
            head: true,
          }
        ),

      supabase
        .from('stores')
        .select(
          'id',
          {
            count:
              'exact',
            head: true,
          }
        ),
    ]);

  if (
    salesResult.error
  ) {
    throw new Error(
      `Could not load sales count: ${salesResult.error.message}`
    );
  }

  if (
    storesResult.error
  ) {
    throw new Error(
      `Could not load stores count: ${storesResult.error.message}`
    );
  }

  /*
   * ==========================================================
   * LOAD TODAY'S ATTENDANCE
   * ==========================================================
   *
   * This is the source for:
   *
   * - Visits
   * - Routes
   * - Salesperson performance
   * - Route gaps
   */

  const {
    data: attendance,
    error: attendanceError,
  } =
    await supabase
      .from('attendance')
      .select(
        `
        id,
        sales_id,
        store_id,
        created_at,
        status,
        sales:sales_id (
          id,
          name,
          sales_code
        ),
        store:store_id (
          id,
          name,
          store_code
        )
        `
      )
      .gte(
        'created_at',
        startISO
      )
      .lte(
        'created_at',
        endISO
      )
      .order(
        'created_at',
        {
          ascending:
            true,
        }
      );

  if (
    attendanceError
  ) {
    throw new Error(
      `Could not load today's attendance: ${attendanceError.message}`
    );
  }

  /*
   * ==========================================================
   * LOAD TODAY'S ORDERS
   * ==========================================================
   *
   * Existing relationship:
   *
   * spins.attendance_id
   *       ↓
   * attendance.id
   *
   * So we first get today's attendance IDs, then ask for spins
   * belonging to those visits.
   */

  const attendanceIds =
    (attendance ?? [])
      .map(
        (
          record
        ) =>
          record.id
      )
      .filter(
        (
          id
        ): id is string =>
          typeof id ===
            'string' &&
          id.length >
            0
      );

  let spins: {
    id: string;
    attendance_id:
      | string
      | null;
  }[] = [];

  if (
    attendanceIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from('spins')
        .select(
          `
          id,
          attendance_id
          `
        )
        .in(
          'attendance_id',
          attendanceIds
        );

    if (
      error
    ) {
      throw new Error(
        `Could not load today's orders: ${error.message}`
      );
    }

    spins =
      (data ?? []) as typeof spins;
  }

  /*
   * ==========================================================
   * ORDER LOOKUP
   * ==========================================================
   */

  const orderedAttendanceIds =
    new Set(
      spins
        .map(
          (
            spin
          ) =>
            spin.attendance_id
        )
        .filter(
          (
            id
          ): id is string =>
            typeof id ===
              'string' &&
            id.length >
              0
        )
    );

  /*
   * ==========================================================
   * TODAY'S VISITS
   * ==========================================================
   */

  const todayVisits =
    attendance?.length ??
    0;

  const todayOrders =
    orderedAttendanceIds.size;

  /*
   * ==========================================================
   * TODAY'S ROUTES
   * ==========================================================
   *
   * Number of sales representatives who have recorded
   * attendance today.
   */

  const routeSalesIds =
    new Set(
      (attendance ?? [])
        .map(
          (
            record
          ) =>
            record.sales_id
        )
        .filter(
          (
            id
          ): id is string =>
            typeof id ===
              'string' &&
            id.length >
              0
        )
    );

  const todayRoutes =
    routeSalesIds.size;

  /*
   * ==========================================================
   * SALES PERFORMANCE
   * ==========================================================
   */

  type AttendanceRow =
    {
      id: string;

      sales_id:
        | string
        | null;

      created_at:
        | string
        | null;

      status:
        | string
        | null;

      sales:
        | {
            id: string;
            name:
              | string
              | null;
            sales_code:
              | string
              | null;
          }
        | null;
    };

  const attendanceRows =
    (attendance ??
      []) as unknown as AttendanceRow[];

  const salesMap =
    new Map<
      string,
      {
        salesName: string;
        visits: number;
        orders: number;
      }
    >();

  for (
    const record of attendanceRows
  ) {
    if (
      !record.sales_id
    ) {
      continue;
    }

    const existing =
      salesMap.get(
        record.sales_id
      ) ?? {
        salesName:
          record.sales?.name ??
          'Unknown sales rep',

        visits:
          0,

        orders:
          0,
      };

    existing.visits +=
      1;

    if (
      orderedAttendanceIds.has(
        record.id
      )
    ) {
      existing.orders +=
        1;
    }

    /*
     * Prefer the actual name from the database.
     */

    if (
      record.sales?.name
    ) {
      existing.salesName =
        record.sales.name;
    }

    salesMap.set(
      record.sales_id,
      existing
    );
  }

  const topSales:
    AdminSalesPerformance[] =
    Array.from(
      salesMap.entries()
    )
      .map(
        ([
          salesId,
          value,
        ]) => ({
          salesId,

          salesName:
            value.salesName,

          visits:
            value.visits,

          orders:
            value.orders,

          conversionRate:
            value.visits >
            0
              ? (value.orders /
                  value.visits) *
                100
              : 0,
        })
      )
      .sort(
        (
          a,
          b
        ) => {
          /*
           * Primary sort:
           * orders descending.
           */

          if (
            b.orders !==
            a.orders
          ) {
            return (
              b.orders -
              a.orders
            );
          }

          /*
           * Secondary:
           * visits descending.
           */

          return (
            b.visits -
            a.visits
          );
        }
      )
      .slice(
        0,
        5
      );

  /*
   * ==========================================================
   * ORDER CONVERSION
   * ==========================================================
   */

  const conversionRate =
    todayVisits >
    0
      ? (todayOrders /
          todayVisits) *
        100
      : 0;

  /*
   * ==========================================================
   * ROUTE ALERTS
   * ==========================================================
   *
   * We look for long gaps between consecutive visits by the
   * same salesperson.
   *
   * This is derived directly from recorded attendance times.
   *
   * No fake alerts.
   */

  const alertMap =
    new Map<
      string,
      AdminRouteAlert
    >();

  const attendanceBySales =
    new Map<
      string,
      AttendanceRow[]
    >();

  for (
    const record of attendanceRows
  ) {
    if (
      !record.sales_id
    ) {
      continue;
    }

    const existing =
      attendanceBySales.get(
        record.sales_id
      ) ?? [];

    existing.push(
      record
    );

    attendanceBySales.set(
      record.sales_id,
      existing
    );
  }

  for (
    const [
      salesId,
      records,
    ] of attendanceBySales
  ) {
    const sorted =
      [...records].sort(
        (
          a,
          b
        ) => {
          const timeA =
            a.created_at
              ? new Date(
                  a.created_at
                ).getTime()
              : 0;

          const timeB =
            b.created_at
              ? new Date(
                  b.created_at
                ).getTime()
              : 0;

          return (
            timeA - timeB
          );
        }
      );

    for (
      let index = 1;
      index <
      sorted.length;
      index++
    ) {
      const previous =
        sorted[
          index - 1
        ];

      const current =
        sorted[
          index
        ];

      if (
        !previous.created_at ||
        !current.created_at
      ) {
        continue;
      }

      const previousTime =
        new Date(
          previous.created_at
        ).getTime();

      const currentTime =
        new Date(
          current.created_at
        ).getTime();

      const gap =
        currentTime -
        previousTime;

      /*
       * More than 2 hours.
       */

      if (
        gap >=
        2 * 60 * 60 * 1000
      ) {
        alertMap.set(
          salesId,
          {
            salesId,

            salesName:
              current.sales?.name ??
              previous.sales?.name ??
              'Unknown sales rep',

            message:
              `${formatGap(
                gap
              )} gap between recorded visits`,

            severity:
              gap >=
              3 * 60 * 60 * 1000
                ? 'warning'
                : 'info',
          }
        );

        break;
      }
    }
  }

  const routeAlerts =
    Array.from(
      alertMap.values()
    ).sort(
      (
        a,
        b
      ) => {
        if (
          a.severity ===
            'warning' &&
          b.severity !==
            'warning'
        ) {
          return -1;
        }

        if (
          a.severity !==
            'warning' &&
          b.severity ===
            'warning'
        ) {
          return 1;
        }

        return a.salesName.localeCompare(
          b.salesName
        );
      }
    );

  /*
   * ==========================================================
   * RETURN
   * ==========================================================
   */

  return {
    salesCount:
      salesResult.count ??
      0,

    storesCount:
      storesResult.count ??
      0,

    todayVisits,

    todayOrders,

    todayRoutes,

    conversionRate,

    topSales,

    routeAlerts,
  };
}