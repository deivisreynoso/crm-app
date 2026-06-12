"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^(https?:\/\/|mailto:|tel:|#)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function InsertLinkModal({
  open,
  onClose,
  initialUrl,
  initialText,
  hasSelection,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  initialUrl: string;
  initialText: string;
  hasSelection: boolean;
  onApply: (url: string, text: string) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setText(initialText);
    }
  }, [open, initialUrl, initialText]);

  return (
    <Modal open={open} onClose={onClose} title="Insert link" size="md">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">URL</label>
          <input
            type="url"
            className="input-field w-full"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onApply(normalizeUrl(url), text);
              }
            }}
          />
        </div>
        {!hasSelection && (
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Display text
            </label>
            <input
              type="text"
              className="input-field w-full"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Link label"
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onApply(normalizeUrl(url), text)}
            disabled={!url.trim() && !hasSelection}
          >
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function InsertImageModal({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (url: string, alt: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");

  useEffect(() => {
    if (open) {
      setUrl("");
      setAlt("");
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Insert image" size="md">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Image URL</label>
          <input
            type="url"
            className="input-field w-full"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/image.png"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">
            Alt text (optional)
          </label>
          <input
            type="text"
            className="input-field w-full"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Describe the image"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onApply(url.trim(), alt.trim())} disabled={!url.trim()}>
            Insert
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function InsertTableModal({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (rows: number, cols: number, withHeaderRow: boolean) => void;
}) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [withHeaderRow, setWithHeaderRow] = useState(true);

  useEffect(() => {
    if (open) {
      setRows(3);
      setCols(3);
      setWithHeaderRow(true);
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Insert table" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Rows</label>
            <input
              type="number"
              min={1}
              max={20}
              className="input-field w-full"
              value={rows}
              onChange={(e) => setRows(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Columns</label>
            <input
              type="number"
              min={1}
              max={10}
              className="input-field w-full"
              value={cols}
              onChange={(e) => setCols(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={withHeaderRow}
            onChange={(e) => setWithHeaderRow(e.target.checked)}
          />
          Include header row
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onApply(rows, cols, withHeaderRow)}>
            Insert table
          </Button>
        </div>
      </div>
    </Modal>
  );
}
