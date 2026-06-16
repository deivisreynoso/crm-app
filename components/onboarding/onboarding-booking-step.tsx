"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";

type SlotOffer = {
  index: number;
  label: string;
  iso_start: string;
};

type Props = {
  token: string;
  locale: "en" | "es";
  primaryColor: string;
};

export function OnboardingBookingStep({ token, locale, primaryColor }: Props) {
  const [offers, setOffers] = useState<SlotOffer[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    start_time: string;
    meet_link?: string | null;
  } | null>(null);

  const copy =
    locale === "es"
      ? {
          title: "¡Gracias! Ahora agenda tu reunión de inicio de proyecto.",
          subtitle: "Elige un horario disponible para tu kickoff con el equipo de ClickIn 360.",
          confirm: "Confirmar reunión",
          booking: "Agendando…",
          noSlots: "No hay horarios disponibles en este momento. Revisa tu correo — te enviaremos un enlace para agendar.",
          done: "¡Reunión confirmada!",
          meet: "Unirse a Google Meet",
        }
      : {
          title: "Thank you! Now schedule your project kickoff meeting.",
          subtitle: "Pick an available time for your kickoff with the ClickIn 360 team.",
          confirm: "Confirm meeting",
          booking: "Booking…",
          noSlots: "No slots are available right now. Check your email — we'll send a booking link.",
          done: "Meeting confirmed!",
          meet: "Join Google Meet",
        };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void axios
      .get<{
        offers: SlotOffer[];
        available_slots: string[];
      }>(`/api/customer/booking-offers?token=${encodeURIComponent(token)}&lang=${locale}`)
      .then((res) => {
        if (cancelled) return;
        setOffers(res.data.offers ?? []);
        setAvailableSlots(res.data.available_slots ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(copy.noSlots);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, locale, copy.noSlots]);

  async function book(offer: SlotOffer) {
    setBooking(true);
    setError(null);
    try {
      const { data } = await axios.post<{
        start_time: string;
        meet_link?: string | null;
      }>("/api/customer/bookings", {
        token,
        slot_index: offer.index,
        offered_slots: availableSlots,
      });
      setConfirmed({ start_time: data.start_time, meet_link: data.meet_link });
    } catch {
      setError(locale === "es" ? "No se pudo agendar. Intenta de nuevo." : "Could not book. Please try again.");
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
          {new Date(confirmed.start_time).toLocaleString(locale === "es" ? "es-MX" : "en-US", {
            dateStyle: "full",
            timeStyle: "short",
          })}
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1a1a18] mb-2">{copy.title}</h2>
        <p className="text-sm text-[#5f5e5a]">{copy.subtitle}</p>
      </div>
      {loading ? (
        <p className="text-sm text-[#5f5e5a]">{locale === "es" ? "Cargando horarios…" : "Loading slots…"}</p>
      ) : offers.length === 0 ? (
        <p className="text-sm text-[#5f5e5a]">{error ?? copy.noSlots}</p>
      ) : (
        <ul className="space-y-2">
          {offers.map((offer) => (
            <li key={offer.index}>
              <button
                type="button"
                disabled={booking}
                onClick={() => void book(offer)}
                className="w-full text-left rounded-lg border border-[#e5e5e3] px-4 py-3 text-sm hover:border-[#d3d1c7] bg-white"
              >
                {offer.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && offers.length > 0 && <p className="text-sm text-red-600">{error}</p>}
      {booking && (
        <Button type="button" disabled style={{ background: primaryColor }}>
          {copy.booking}
        </Button>
      )}
    </div>
  );
}
