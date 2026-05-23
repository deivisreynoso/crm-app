"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { formatApiError } from "@/lib/validation-errors";
import axios from "axios";

export function TeamSettings() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    try {
      await axios.post("/api/team/members", {
        email: email.trim(),
        display_name: name.trim() || undefined,
      });
      setEmail("");
      setName("");
      setMsg("Teammate added. They appear in task assignee lists once they have an account with that email.");
    } catch (err) {
      setError(formatApiError(err, "Could not add teammate"));
    }
  }

  return (
    <form onSubmit={handleAdd} className="space-y-3 max-w-md">
      <p className="text-sm text-body-muted">
        Add teammates by email so you can assign tasks. They must register with the same
        email to appear as assignable.
      </p>
      {error && (
        <p className="text-sm text-[var(--error)]">{error}</p>
      )}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <div>
        <FormLabel>Email</FormLabel>
        <input
          type="email"
          className="input-field w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <FormLabel>Display name</FormLabel>
        <input
          className="input-field w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional"
        />
      </div>
      <Button type="submit" size="sm">
        Add teammate
      </Button>
    </form>
  );
}
