import { useState } from "react";

// Reset when filters change and clamp when results shrink, before rendering rows.
export const usePagination = (filterKey, totalPages) => {
  const [pagination, setPagination] = useState({ filterKey, page: 1 });
  const lastPage = Math.max(1, totalPages);
  const page = pagination.filterKey === filterKey ? Math.min(pagination.page, lastPage) : 1;

  if (pagination.filterKey !== filterKey || pagination.page !== page) {
    setPagination({ filterKey, page });
  }

  const setPage = update => setPagination(previous => {
    const current = previous.filterKey === filterKey ? Math.min(previous.page, lastPage) : 1;
    const next = typeof update === "function" ? update(current) : update;
    return { filterKey, page: Math.max(1, Math.min(next, lastPage)) };
  });

  return [page, setPage];
};
