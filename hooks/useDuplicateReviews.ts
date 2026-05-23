import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export interface DuplicateReviewContact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
}

export interface DuplicateReview {
  id: string;
  contact1_id: string;
  contact2_id: string;
  similarity_score?: number;
  status: string;
  contact1?: DuplicateReviewContact | null;
  contact2?: DuplicateReviewContact | null;
}

export function useDuplicateReviews(status = "pending") {
  return useQuery({
    queryKey: ["duplicate-reviews", status],
    queryFn: async () => {
      const { data } = await axios.get<{ data: DuplicateReview[] }>(
        "/api/duplicate-reviews",
        { params: { status } }
      );
      return data.data;
    },
  });
}

export function useScanDuplicates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      axios.post<{
        scanned: number;
        pairsFound: number;
        created: number;
        emailGroups?: number;
        phoneGroups?: number;
      }>(
        "/api/duplicate-reviews",
        { action: "scan" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["duplicate-reviews"] });
    },
  });
}

export function useResolveDuplicate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      keep_contact_id,
    }: {
      id: string;
      action: "dismiss" | "merge";
      keep_contact_id?: string;
    }) => axios.patch(`/api/duplicate-reviews/${id}`, { action, keep_contact_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["duplicate-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}
