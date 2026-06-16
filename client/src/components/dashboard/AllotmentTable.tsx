"use client";

import { useState } from "react";
import { RefreshCw, Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate, maskPAN } from "@/lib/utils";
import type { AllotmentItem } from "@/store/ipoStore";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 10;

interface AllotmentTableProps {
  data: AllotmentItem[];
  isLoading: boolean;
  onRefresh: () => void;
  showOwner?: boolean;
  isServerPaginated?: boolean;
  totalCount?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  compact?: boolean;
}

export function AllotmentTable({
  data,
  isLoading,
  onRefresh,
  showOwner = false,
  isServerPaginated = false,
  totalCount = 0,
  currentPage = 1,
  onPageChange,
  compact = false,
}: AllotmentTableProps) {
  const [localPage, setLocalPage] = useState(1);

  const page = isServerPaginated ? currentPage : localPage;
  const totalCountToUse = isServerPaginated ? totalCount : data.length;
  const totalPages = Math.ceil(totalCountToUse / PAGE_SIZE);
  const startIndex = (page - 1) * PAGE_SIZE;
  const paginatedData = isServerPaginated ? data : data.slice(startIndex, startIndex + PAGE_SIZE);

  const handlePageChange = (newPage: number) => {
    if (isServerPaginated) {
      onPageChange?.(newPage);
    } else {
      setLocalPage(newPage);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (totalCountToUse === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <Inbox className="h-7 w-7 text-slate-400" />
        </div>
        <h3 className="mb-1 font-medium text-slate-900">No allotment records yet</h3>
        <p className="max-w-xs text-sm text-slate-500">
          Add a member PAN and wait for an admin to trigger the allotment sync.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Table Header Controls */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Showing {startIndex + 1}–{Math.min(startIndex + paginatedData.length, totalCountToUse)} of {totalCountToUse} records
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-7 gap-1.5 text-xs text-slate-500 hover:text-slate-900"
          id="refresh-allotments-btn"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200/60 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {showOwner && <TableHead>Account Owner</TableHead>}
              {!compact && <TableHead>Member</TableHead>}
              {!compact && <TableHead>PAN</TableHead>}
              <TableHead>IPO</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row) => (
              <TableRow key={row.allotment_id}>
                {showOwner && (
                  <TableCell className="font-medium text-slate-700 text-xs">
                    {row.master_account_owner ?? "—"}
                  </TableCell>
                )}
                {!compact && (
                  <TableCell className="font-medium text-slate-900">
                    {row.member_friendly_name}
                  </TableCell>
                )}
                {!compact && (
                  <TableCell>
                    <span className="font-mono text-xs tracking-widest text-slate-600">
                      {maskPAN(row.pan_num)}
                    </span>
                  </TableCell>
                )}
                <TableCell className="text-slate-700 font-medium text-sm">
                  {row.ipo_name}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-xs text-slate-400">
                  {formatDate(row.updated_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            id="prev-page-btn"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            id="next-page-btn"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
