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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

type Props<TData> = {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  searchPlaceholder?: string;
  searchKey?: string;
  rowHref?: (row: TData) => string;
  pageSize?: number;
  filters?: React.ReactNode;
};

export function DataTable<TData>({
  data,
  columns,
  searchPlaceholder = "Rechercher…",
  searchKey,
  rowHref,
  pageSize = 50,
  filters,
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {searchKey !== undefined && (
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        {filters}
        <div className="ml-auto text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} résultats
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    onClick={
                      header.column.getCanSort()
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                    className={
                      header.column.getCanSort()
                        ? "cursor-pointer select-none hover:bg-muted/50"
                        : ""
                    }
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {header.column.getIsSorted() === "asc" && " ↑"}
                    {header.column.getIsSorted() === "desc" && " ↓"}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucun résultat.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const href = rowHref?.(row.original);
                return (
                  <TableRow
                    key={row.id}
                    className={href ? "cursor-pointer hover:bg-muted/30" : ""}
                    onClick={href ? () => router.push(href) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
