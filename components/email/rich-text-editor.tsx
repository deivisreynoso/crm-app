"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Strikethrough,
  TableIcon,
  Underline as UnderlineIcon,
  Unlink,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  InsertImageModal,
  InsertLinkModal,
  InsertTableModal,
} from "@/components/email/editor-format-modals";
import { BlockIndent, FontFamily, FontSize } from "@/lib/email/tiptap-font-extensions";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  onInsertSignature?: () => void;
  className?: string;
};

type SavedSelection = { from: number; to: number };

type ToolbarActiveState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  bulletList: boolean;
  orderedList: boolean;
  codeBlock: boolean;
  alignLeft: boolean;
  alignCenter: boolean;
  alignRight: boolean;
};

const INITIAL_TOOLBAR_ACTIVE: ToolbarActiveState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  bulletList: false,
  orderedList: false,
  codeBlock: false,
  alignLeft: false,
  alignCenter: false,
  alignRight: false,
};

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active ? true : undefined}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded border border-transparent text-body-muted hover:bg-[var(--surface-subtle)] hover:text-heading transition-colors",
        active &&
          "bg-[color-mix(in_srgb,var(--primary)_14%,var(--card))] text-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_35%,transparent)] shadow-sm"
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your message…",
  minHeight = "200px",
  onInsertSignature,
  className,
}: RichTextEditorProps) {
  const savedSelection = useRef<SavedSelection | null>(null);
  const lastEmittedHtml = useRef(value);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkInitialUrl, setLinkInitialUrl] = useState("https://");
  const [linkInitialText, setLinkInitialText] = useState("");
  const [linkHasSelection, setLinkHasSelection] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [fontFamily, setFontFamily] = useState("");
  const [fontSize, setFontSize] = useState("");
  const [blockFormat, setBlockFormat] = useState("p");
  const [toolbarActive, setToolbarActive] = useState<ToolbarActiveState>(INITIAL_TOOLBAR_ACTIVE);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
        bulletList: {
          HTMLAttributes: { class: "email-bullet-list" },
        },
        orderedList: {
          HTMLAttributes: { class: "email-ordered-list" },
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      FontFamily,
      FontSize,
      BlockIndent,
      Color,
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class: "focus:outline-none px-3 py-2 min-h-[inherit] text-sm text-heading",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      lastEmittedHtml.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedHtml.current) return;
    const current = editor.getHTML();
    if (value !== current && value !== undefined) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
      lastEmittedHtml.current = value;
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    const ed = editor;

    function syncToolbar() {
      const textStyle = ed.getAttributes("textStyle");
      setFontFamily((textStyle.fontFamily as string | undefined) ?? "");
      setFontSize((textStyle.fontSize as string | undefined) ?? "");

      if (ed.isActive("heading", { level: 1 })) setBlockFormat("h1");
      else if (ed.isActive("heading", { level: 2 })) setBlockFormat("h2");
      else if (ed.isActive("heading", { level: 3 })) setBlockFormat("h3");
      else setBlockFormat("p");

      setToolbarActive({
        bold: ed.isActive("bold"),
        italic: ed.isActive("italic"),
        underline: ed.isActive("underline"),
        strike: ed.isActive("strike"),
        bulletList: ed.isActive("bulletList"),
        orderedList: ed.isActive("orderedList"),
        codeBlock: ed.isActive("codeBlock"),
        alignLeft: ed.isActive({ textAlign: "left" }),
        alignCenter: ed.isActive({ textAlign: "center" }),
        alignRight: ed.isActive({ textAlign: "right" }),
      });
    }

    ed.on("selectionUpdate", syncToolbar);
    ed.on("transaction", syncToolbar);
    syncToolbar();

    return () => {
      ed.off("selectionUpdate", syncToolbar);
      ed.off("transaction", syncToolbar);
    };
  }, [editor]);

  function rememberSelection() {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    savedSelection.current = { from, to };
  }

  function restoreSelection() {
    if (!editor || !savedSelection.current) return;
    const { from, to } = savedSelection.current;
    editor.chain().focus().setTextSelection({ from, to }).run();
  }

  function openLinkModal() {
    if (!editor) return;
    rememberSelection();
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    const prev = editor.getAttributes("link").href as string | undefined;
    setLinkInitialUrl(prev ?? "https://");
    setLinkInitialText(hasSelection ? editor.state.doc.textBetween(from, to, " ") : "");
    setLinkHasSelection(hasSelection);
    setLinkModalOpen(true);
  }

  function applyLink(url: string, text: string) {
    if (!editor) return;
    restoreSelection();

    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkModalOpen(false);
      return;
    }

    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;

    if (hasSelection) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    } else if (text.trim()) {
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${url}" rel="noopener noreferrer" target="_blank">${text.trim()}</a>`)
        .run();
    } else {
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${url}" rel="noopener noreferrer" target="_blank">${url}</a>`)
        .run();
    }

    setLinkModalOpen(false);
  }

  function insertTable(rows: number, cols: number, withHeaderRow: boolean) {
    if (!editor) return;
    restoreSelection();
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow }).run();
    setTableModalOpen(false);
  }

  function insertImage(url: string, alt: string) {
    if (!editor || !url) return;
    restoreSelection();
    editor.chain().focus().setImage({ src: url, alt: alt || undefined }).run();
    setImageModalOpen(false);
  }

  if (!editor) {
    return (
      <div
        className="border border-[var(--card-border)] rounded-lg bg-[var(--card)] animate-pulse"
        style={{ minHeight }}
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          "rich-text-editor border border-[var(--card-border)] rounded-lg overflow-hidden bg-[var(--card)]",
          className
        )}
      >
        <div className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 py-1.5 space-y-1">
          <div className="flex flex-wrap items-center gap-0.5">
            <ToolbarButton
              title="Clear formatting"
              onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            >
              <span className="text-xs font-semibold px-0.5">Tx</span>
            </ToolbarButton>
            <input
              type="color"
              title="Font color"
              className="w-6 h-6 border-0 cursor-pointer bg-transparent"
              onMouseDown={(e) => e.preventDefault()}
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            />
            <input
              type="color"
              title="Highlight color"
              className="w-6 h-6 border-0 cursor-pointer bg-transparent"
              onMouseDown={(e) => e.preventDefault()}
              onChange={(e) =>
                editor.chain().focus().toggleHighlight({ color: e.target.value }).run()
              }
            />
            <ToolbarButton
              title="Bold"
              active={toolbarActive.bold}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Italic"
              active={toolbarActive.italic}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Underline"
              active={toolbarActive.underline}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Strikethrough"
              active={toolbarActive.strike}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Insert table"
              onClick={() => {
                rememberSelection();
                setTableModalOpen(true);
              }}
            >
              <TableIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Insert image"
              onClick={() => {
                rememberSelection();
                setImageModalOpen(true);
              }}
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Code block"
              active={toolbarActive.codeBlock}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
              <Code className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Hyperlink" onClick={openLinkModal}>
              <Link2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Unlink"
              onClick={() => editor.chain().focus().unsetLink().run()}
            >
              <Unlink className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Align left"
              active={toolbarActive.alignLeft}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Align center"
              active={toolbarActive.alignCenter}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Align right"
              active={toolbarActive.alignRight}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              <AlignRight className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Bullet list"
              active={toolbarActive.bulletList}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Numbered list"
              active={toolbarActive.orderedList}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Decrease indent"
              onClick={() => editor.chain().focus().outdentBlock().run()}
            >
              <IndentDecrease className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Increase indent"
              onClick={() => editor.chain().focus().indentBlock().run()}
            >
              <IndentIncrease className="h-3.5 w-3.5" />
            </ToolbarButton>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="input-field text-xs py-1 h-8 max-w-[120px]"
              title="Font family"
              value={fontFamily}
              onMouseDown={(e) => e.preventDefault()}
              onChange={(e) => {
                const next = e.target.value;
                if (!next) {
                  editor.chain().focus().unsetFontFamily().run();
                } else {
                  editor.chain().focus().setFontFamily(next).run();
                }
              }}
            >
              <option value="">Font</option>
              <option value="Inter, sans-serif">Inter</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Times New Roman, serif">Times New Roman</option>
            </select>
            <select
              className="input-field text-xs py-1 h-8 max-w-[80px]"
              title="Font size"
              value={fontSize}
              onMouseDown={(e) => e.preventDefault()}
              onChange={(e) => {
                const next = e.target.value;
                if (!next) {
                  editor.chain().focus().unsetFontSize().run();
                } else {
                  editor.chain().focus().setFontSize(next).run();
                }
              }}
            >
              <option value="">Size</option>
              <option value="12px">12</option>
              <option value="14px">14</option>
              <option value="16px">16</option>
              <option value="18px">18</option>
              <option value="24px">24</option>
            </select>
            <select
              className="input-field text-xs py-1 h-8 max-w-[120px]"
              title="Format"
              value={blockFormat}
              onMouseDown={(e) => e.preventDefault()}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "p") {
                  editor.chain().focus().setParagraph().run();
                } else if (v.startsWith("h")) {
                  const level = Number(v.replace("h", "")) as 1 | 2 | 3;
                  editor.chain().focus().setHeading({ level }).run();
                }
              }}
            >
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>
            {onInsertSignature && (
              <ToolbarButton title="Insert signature" onClick={onInsertSignature}>
                <UserRound className="h-3.5 w-3.5" />
              </ToolbarButton>
            )}
          </div>
        </div>
        <EditorContent editor={editor} style={{ minHeight }} />
      </div>

      <InsertLinkModal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        initialUrl={linkInitialUrl}
        initialText={linkInitialText}
        hasSelection={linkHasSelection}
        onApply={applyLink}
      />
      <InsertImageModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onApply={insertImage}
      />
      <InsertTableModal
        open={tableModalOpen}
        onClose={() => setTableModalOpen(false)}
        onApply={insertTable}
      />
    </>
  );
}
