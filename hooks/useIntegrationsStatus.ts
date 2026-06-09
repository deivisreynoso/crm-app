import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export type GmailStatus = {
  connected: boolean;
  configured: boolean;
  redirect_uri?: string;
  email?: string | null;
  read_access?: boolean;
};

export type CalendarStatus = {
  connected: boolean;
  configured: boolean;
  redirect_uri?: string;
  email?: string | null;
};

export function useGmailStatus() {
  return useQuery({
    queryKey: ["integration-gmail-status"],
    queryFn: async () => {
      const { data } = await axios.get<GmailStatus>(
        "/api/integrations/gmail/status"
      );
      return data;
    },
    staleTime: 60_000,
  });
}

export function useCalendarStatus() {
  return useQuery({
    queryKey: ["integration-calendar-status"],
    queryFn: async () => {
      const { data } = await axios.get<CalendarStatus>(
        "/api/integrations/google-calendar/status"
      );
      return data;
    },
    staleTime: 60_000,
  });
}
