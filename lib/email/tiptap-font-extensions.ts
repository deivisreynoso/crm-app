import { Extension } from "@tiptap/core";

export type FontFamilyOptions = {
  types: string[];
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontFamily: {
      setFontFamily: (fontFamily: string) => ReturnType;
      unsetFontFamily: () => ReturnType;
    };
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    blockIndent: {
      indentBlock: () => ReturnType;
      outdentBlock: () => ReturnType;
    };
  }
}

export const FontFamily = Extension.create<FontFamilyOptions>({
  name: "fontFamily",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element) =>
              element.style.fontFamily?.replace(/['"]+/g, "") || null,
            renderHTML: (attributes) => {
              if (!attributes.fontFamily) return {};
              return { style: `font-family: ${attributes.fontFamily}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontFamily:
        (fontFamily) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontFamily }).run(),
      unsetFontFamily:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontFamily: null }).removeEmptyTextStyle().run(),
    };
  },
});

export const FontSize = Extension.create<FontFamilyOptions>({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

export const BlockIndent = Extension.create({
  name: "blockIndent",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const raw = element.getAttribute("data-indent");
              return raw ? Number.parseInt(raw, 10) : 0;
            },
            renderHTML: (attributes) => {
              const level = Number(attributes.indent) || 0;
              if (level <= 0) return {};
              return {
                style: `margin-left: ${level * 2}em`,
                "data-indent": String(level),
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      indentBlock:
        () =>
        ({ editor, chain }) => {
          if (editor.isActive("listItem")) {
            return chain().focus().sinkListItem("listItem").run();
          }
          const blockType = editor.isActive("heading") ? "heading" : "paragraph";
          const current = Number(editor.getAttributes(blockType).indent) || 0;
          return chain()
            .focus()
            .updateAttributes(blockType, { indent: Math.min(current + 1, 8) })
            .run();
        },
      outdentBlock:
        () =>
        ({ editor, chain }) => {
          if (editor.isActive("listItem")) {
            return chain().focus().liftListItem("listItem").run();
          }
          const blockType = editor.isActive("heading") ? "heading" : "paragraph";
          const current = Number(editor.getAttributes(blockType).indent) || 0;
          return chain()
            .focus()
            .updateAttributes(blockType, { indent: Math.max(current - 1, 0) })
            .run();
        },
    };
  },
});
