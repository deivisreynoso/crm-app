"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { AuditLogRow } from "@/app/api/audit-logs/route";

type AuditLogsResponse = {
  data: AuditLogRow[];
  page: number;
  limit: number;
  total: number;
};

export function useAuditLogs(page = 1, limit = 50) {
  return useQuery({
    queryKey: ["audit-logs", page, limit],
    queryFn: async () => {
      const { data } = await axios.get<AuditLogsResponse>("/api/audit-logs", {
        params: { page, limit },
      });
      return data;
    },
  });
}
