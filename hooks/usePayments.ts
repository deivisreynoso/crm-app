import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method?: string | null;
  stripe_payment_id?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
  created_at: string;
  contact?: { id: string; first_name: string; last_name: string } | null;
  opportunity?: { id: string; title: string } | null;
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data } = await axios.get<{ data: PaymentRecord[] }>("/api/payments");
      return data.data;
    },
  });
}
