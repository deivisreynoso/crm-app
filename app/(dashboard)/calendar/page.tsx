"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useCalendarEvents, useCreateCalendarEvent } from "@/hooks/useCalendar";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { formatDate } from "@/lib/utils";

export default function CalendarPage() {
  return (
    <Suspense fallback={<p className="text-[var(--muted)]">Loading calendar…</p>}>
      <CalendarPageContent />
    </Suspense>
  );
}

function CalendarPageContent() {
  const searchParams = useSearchParams();
  const { data: events = [], isLoading } = useCalendarEvents();
  const createEvent = useCreateCalendarEvent();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [contactId, setContactId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const { data: contactsData } = useContacts(1, 100);
  const { data: companies = [] } = useCompanies();

  useEffect(() => {
    const presetContact = searchParams.get("contact_id") ?? "";
    const presetCompany = searchParams.get("company_id") ?? "";
    if (searchParams.get("new") === "1") {
      setModalOpen(true);
      if (presetContact) setContactId(presetContact);
      if (presetCompany) setCompanyId(presetCompany);
    }
  }, [searchParams]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !start || !end) return;
    if (!contactId && !companyId) return;
    await createEvent.mutateAsync({
      title: title.trim(),
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      location: location || undefined,
      contact_id: contactId || undefined,
      company_id: companyId || undefined,
    });
    setModalOpen(false);
    setTitle("");
    setStart("");
    setEnd("");
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="text-sm text-slate-600 mt-1">
            Events linked to accounts and contacts
          </p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          New event
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg divide-y">
        {isLoading ? (
          <p className="p-6 text-slate-600">Loading…</p>
        ) : events.length === 0 ? (
          <p className="p-6 text-slate-600">No upcoming events.</p>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="px-4 py-3 flex justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">{ev.title}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(ev.start_time)} — {formatDate(ev.end_time)}
                  {ev.location ? ` · ${ev.location}` : ""}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New event">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start</label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End</label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Account</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">—</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact</label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">—</option>
              {(contactsData?.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Link to account and/or contact</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEvent.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
