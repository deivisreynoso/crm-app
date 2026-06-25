"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMonthGrid, shiftMonth } from "@/lib/calendar/utils";
import {
  getWeekdayInZone,
  slotToDate,
  validateBookingSlot,
} from "@/lib/website/booking-availability";

type BookingConfig = {
  timezone: string;
  timezone_label: string;
  meeting_duration_minutes: number;
  buffer_minutes: number;
  availability: {
    days: number[];
    start_time: string;
    end_time: string;
    min_notice_hours: number;
    max_days_ahead: number;
  };
};

type Props = {
  token: string;
  locale: "en" | "es";
  primaryColor: string;
};

function dateKeyInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function OnboardingBookingStep({ token, locale, primaryColor }: Props) {
  const [config, setConfig] = useState<BookingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [confirmed, setConfirmed] = useState<{
    start_time: string;
    meet_link?: string | null;
  } | null>(null);

  const copy =
    locale === "es"
      ? {
          title: "¡Gracias! Ahora agenda tu reunión de inicio de proyecto.",
          subtitle:
            "Elige la fecha y hora que mejor te funcionen. Al final del cuestionario podrás confirmar tu kickoff con el equipo de ClickIn 360.",
          pickDate: "Selecciona una fecha",
          pickTime: "Hora de inicio",
          timezone: "Zona horaria",
          duration: "Duración",
          minutes: "min",
          confirm: "Confirmar reunión",
          booking: "Agendando…",
          loadError:
            "No pudimos cargar el calendario. Intenta de nuevo en unos minutos.",
          invalidSlot:
            "Esa fecha u hora no está disponible. Elige un día laboral dentro del horario de atención.",
          done: "¡Reunión confirmada!",
          meet: "Unirse a Google Meet",
        }
      : {
          title: "Thank you! Now schedule your project kickoff meeting.",
          subtitle:
            "Choose the date and time that work best for you. Your kickoff with the ClickIn 360 team will be confirmed on the next step.",
          pickDate: "Select a date",
          pickTime: "Start time",
          timezone: "Timezone",
          duration: "Duration",
          minutes: "min",
          confirm: "Confirm meeting",
          booking: "Booking…",
          loadError: "We could not load the calendar. Please try again shortly.",
          invalidSlot:
            "That date or time is not available. Choose a business day within booking hours.",
          done: "Meeting confirmed!",
          meet: "Join Google Meet",
        };

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void axios
      .get<BookingConfig>(
        `/api/customer/booking-offers?token=${encodeURIComponent(token)}&lang=${locale}`
      )
      .then((res) => {
        if (cancelled) return;
        setConfig(res.data);
        const todayKey = dateKeyInZone(new Date(), res.data.timezone);
        setSelectedDate(todayKey);
        setSelectedTime(res.data.availability.start_time.slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) setError(copy.loadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, locale, copy.loadError]);

  const bounds = useMemo(() => {
    if (!config) return null;
    const now = new Date();
    const min = new Date(
      now.getTime() + config.availability.min_notice_hours * 3_600_000
    );
    const max = new Date(
      now.getTime() + config.availability.max_days_ahead * 24 * 3_600_000
    );
    return {
      minKey: dateKeyInZone(min, config.timezone),
      maxKey: dateKeyInZone(max, config.timezone),
    };
  }, [config]);

  function isSelectableDay(day: Date): boolean {
    if (!config || !bounds) return false;
    const key = dateKeyInZone(day, config.timezone);
    if (key < bounds.minKey || key > bounds.maxKey) return false;
    return config.availability.days.includes(
      getWeekdayInZone(key, config.timezone)
    );
  }

  async function book() {
    if (!config || !selectedDate || !selectedTime) return;
    const slotConfig = {
      ...config.availability,
      timezone: config.timezone,
      meeting_duration_minutes: config.meeting_duration_minutes,
      buffer_minutes: config.buffer_minutes ?? 0,
    };
    const validation = validateBookingSlot(
      selectedDate,
      selectedTime,
      slotConfig,
      new Date()
    );
    if (!validation.ok) {
      setError(copy.invalidSlot);
      return;
    }

    const slotStart = slotToDate(
      selectedDate,
      selectedTime,
      config.timezone
    ).toISOString();

    setBooking(true);
    setError(null);
    try {
      const { data } = await axios.post<{
        start_time: string;
        meet_link?: string | null;
      }>("/api/customer/bookings", {
        token,
        slot_start: slotStart,
      });
      setConfirmed({ start_time: data.start_time, meet_link: data.meet_link });
    } catch {
      setError(
        locale === "es"
          ? "No se pudo agendar. Intenta de nuevo."
          : "Could not book. Please try again."
      );
    } finally {
      setBooking(false);
    }
  }

  if (confirmed) {
    return (
      <div className="text-center space-y-4 py-6">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto"
          style={{ background: `${primaryColor}22`, color: primaryColor }}
        >
          ✓
        </div>
        <h2 className="text-xl font-semibold text-[#1a1a18]">{copy.done}</h2>
        <p className="text-sm text-[#5f5e5a]">
          {new Date(confirmed.start_time).toLocaleString(
            locale === "es" ? "es-MX" : "en-US",
            { dateStyle: "full", timeStyle: "short" }
          )}
        </p>
        {confirmed.meet_link && (
          <a
            href={confirmed.meet_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-medium underline"
            style={{ color: primaryColor }}
          >
            {copy.meet}
          </a>
        )}
      </div>
    );
  }

  const days = getMonthGrid(viewMonth);
  const weekdays =
    locale === "es"
      ? ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1a1a18] mb-2">{copy.title}</h2>
        <p className="text-sm text-[#5f5e5a]">{copy.subtitle}</p>
      </div>

      {loading ? (
        <p className="text-sm text-[#5f5e5a]">
          {locale === "es" ? "Cargando calendario…" : "Loading calendar…"}
        </p>
      ) : !config ? (
        <p className="text-sm text-red-600">{error ?? copy.loadError}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-[#e5e5e3] bg-white overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#e5e5e3]">
              <button
                type="button"
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-[#f5f5f3]"
                onClick={() => setViewMonth((m) => shiftMonth(m, -1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-[#1a1a18]">
                {format(viewMonth, locale === "es" ? "MMMM yyyy" : "MMMM yyyy")}
              </p>
              <button
                type="button"
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-[#f5f5f3]"
                onClick={() => setViewMonth((m) => shiftMonth(m, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 border-b border-[#e5e5e3] bg-[#fafaf9]">
              {weekdays.map((d) => (
                <div
                  key={d}
                  className="py-2 text-center text-[10px] font-semibold uppercase text-[#8a8983]"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = dateKeyInZone(day, config.timezone);
                const selectable = isSelectableDay(day);
                const selected = selectedDate === key;
                const inMonth = isSameMonth(day, viewMonth);
                const today = isSameDay(day, new Date());

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={!selectable}
                    onClick={() => {
                      setSelectedDate(key);
                      setError(null);
                    }}
                    className={cn(
                      "min-h-[2.75rem] border-b border-r border-[#ececea] text-sm transition-colors",
                      !inMonth && "text-[#b8b7b2]",
                      selectable && "hover:bg-[#f5f5f3] cursor-pointer",
                      !selectable && "opacity-40 cursor-not-allowed",
                      selected && "bg-[#eef6f3] ring-1 ring-inset",
                      today && !selected && "font-semibold"
                    )}
                    style={selected ? { boxShadow: `inset 0 0 0 1px ${primaryColor}` } : undefined}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1a18] mb-1">
                {copy.pickTime}
              </label>
              <input
                type="time"
                className="input-field w-full"
                value={selectedTime}
                min={config.availability.start_time.slice(0, 5)}
                max={config.availability.end_time.slice(0, 5)}
                onChange={(e) => {
                  setSelectedTime(e.target.value);
                  setError(null);
                }}
              />
            </div>
            <dl className="text-xs text-[#5f5e5a] space-y-1">
              <div className="flex justify-between gap-2">
                <dt>{copy.timezone}</dt>
                <dd className="text-[#1a1a18]">{config.timezone_label}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>{copy.duration}</dt>
                <dd className="text-[#1a1a18]">
                  {config.meeting_duration_minutes} {copy.minutes}
                </dd>
              </div>
            </dl>
            {selectedDate && (
              <p className="text-sm text-[#1a1a18]">
                {slotToDate(selectedDate, selectedTime, config.timezone).toLocaleString(
                  locale === "es" ? "es-MX" : "en-US",
                  { dateStyle: "full", timeStyle: "short" }
                )}
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              type="button"
              disabled={booking || !selectedDate}
              onClick={() => void book()}
              style={{ background: primaryColor }}
            >
              {booking ? copy.booking : copy.confirm}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
