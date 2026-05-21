"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Props<TData> = {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  searchPlaceholder?: string;
  searchKey?: string;
  rowHref?: (row: TData) => string;
  pageSize?: number;
  filters?: React.ReactNode;
  emptyMessage?: string;
};

export function DataTable<TData>({
  data,
  columns,
  searchPlaceholder = "Rechercher…",
  searchKey,
  rowHref,
  pageSize = 50,
  filters,
  emptyMessage = "Aucun résultat.",
}: Props<TData>) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const totalRows = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {searchKey !== undefined && (
          <div className="relative flex-1 min-w-64 max-w-md">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 h-8 text-[13px] bg-white border-zinc-200 focus-visible:border-zinc-400 focus-visible:ring-0"
            />
          </div>
        )}
        {filters}
        <div className="ml-auto text-[11px] text-zinc-500 tabular-nums">
          {totalRows.toLocaleString("fr-FR")}{" "}
          {totalRows > 1 ? "résultats" : "résultat"}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-zinc-50/80 border-b border-zinc-200">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sortDir = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        onClick={
                          canSort
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                        className={cn(
                          "px-3 py-2 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap",
                          canSort &&
                            "cursor-pointer select-none hover:text-zinc-900 transition-colors",
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {canSort && (
                            <ArrowUpDown
                              className={cn(
                                "h-3 w-3",
                                sortDir
                                  ? "text-zinc-900"
                                  : "text-zinc-300",
                              )}
                            />
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-24 text-center text-zinc-400 text-[13px]"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const href = rowHref?.(row.original);
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "group transition-colors",
                        href
                          ? "cursor-pointer hover:bg-zinc-50"
                          : "hover:bg-zinc-50/50",
                      )}
                      onClick={
                        href ? () => router.push(href) : undefined
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-3 py-2.5 text-zinc-700"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalRows > pageSize && (
        <div className="flex items-center justify-between text-[12px] text-zinc-500">
          <div>
            Page{" "}
            <span className="text-zinc-900 font-medium tabular-nums">
              {table.getState().pagination.pageIndex + 1}
            </span>{" "}
            sur{" "}
            <span className="text-zinc-900 font-medium tabular-nums">
              {table.getPageCount()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
