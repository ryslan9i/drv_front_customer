import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { Skeleton } from '@/components/ui/skeleton'

interface DataTableProps<T> {
  columns: ColumnDef<T, any>[]
  data: T[]
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  onRowClick?: (row: T) => void
  emptyTitle?: string
  emptyDescription?: string
  pageSize?: number
  /** Controlled current page (0-based). Pass along with onPageIndexChange to persist pagination (e.g. in the URL) across navigation. */
  pageIndex?: number
  onPageIndexChange?: (pageIndex: number) => void
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  error,
  onRetry,
  onRowClick,
  emptyTitle = 'Тут поки що нічого немає',
  emptyDescription,
  pageSize = 10,
  pageIndex: controlledPageIndex,
  onPageIndexChange,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [internalPageIndex, setInternalPageIndex] = useState(0)

  const isControlled = controlledPageIndex !== undefined
  const pageIndex = isControlled ? controlledPageIndex : internalPageIndex
  const setPageIndex = isControlled ? onPageIndexChange! : setInternalPageIndex

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination: { pageIndex, pageSize } },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater({ pageIndex, pageSize }) : updater
      setPageIndex(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // `data` is a fresh array reference every render (filtering isn't memoized), which would
    // otherwise make the built-in auto-reset effect fire continuously — and since pageIndex is
    // controlled externally (e.g. mirrored into the URL), each reset triggers a re-render, which
    // recreates `data` again, looping forever. We own resetting page 0 on filter changes ourselves.
    autoResetPageIndex: false,
  })

  // Clamp out-of-range pages (e.g. after a filter shrinks the result set). Keyed on the page
  // count/index values themselves (not `data`), so it only fires on an actual out-of-range change.
  const pageCount = table.getPageCount()
  useEffect(() => {
    if (isControlled && pageCount > 0 && pageIndex >= pageCount) setPageIndex(0)
  }, [isControlled, pageCount, pageIndex, setPageIndex])

  if (error) return <ErrorState error={error} onRetry={onRetry} />

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-lg border border-border p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortDir === 'asc' && <ArrowUp className="size-3" />}
                          {sortDir === 'desc' && <ArrowDown className="size-3" />}
                          {!sortDir && <ArrowUpDown className="size-3 opacity-40" />}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(onRowClick && 'cursor-pointer')}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Сторінка {table.getState().pagination.pageIndex + 1} з {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Назад
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Далі
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
