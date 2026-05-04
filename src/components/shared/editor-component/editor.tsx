"use client";
import { Color } from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import ListItem from "@tiptap/extension-list-item";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { mergeAttributes } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ChangeEvent, Dispatch, SetStateAction } from "react";
import ToolBar from "./toolbar";

interface IEditorProps {
  setContent: Dispatch<SetStateAction<string>>;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  defaultValue?: string;
}

const LinkedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      href: {
        default: null,
        parseHTML: (element) => {
          const parent = element.parentElement;
          return parent?.tagName === "A" ? parent.getAttribute("href") : null;
        },
      },
      target: {
        default: "_blank",
        parseHTML: (element) => {
          const parent = element.parentElement;
          return parent?.tagName === "A" ? parent.getAttribute("target") : null;
        },
      },
      rel: {
        default: "noopener noreferrer",
        parseHTML: (element) => {
          const parent = element.parentElement;
          return parent?.tagName === "A" ? parent.getAttribute("rel") : null;
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }, { tag: "a[href] img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { href, target, rel, ...imageAttributes } = HTMLAttributes;
    const mergedImageAttrs = mergeAttributes(
      this.options.HTMLAttributes,
      imageAttributes,
    );

    if (href) {
      return ["a", { href, target, rel }, ["img", mergedImageAttrs]];
    }

    return ["img", mergedImageAttrs];
  },
});

const Editor = ({ setContent, onChange }: IEditorProps) => {
  const editor = useEditor({
    extensions: [
      Underline,
      LinkedImage.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          style:
            "max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0;",
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Color.configure({ types: [TextStyle.name, ListItem.name] }),
      TextStyle.configure({ HTMLAttributes: [ListItem.name] }),
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
    ],
    content: "<p>Clear current text and type something.....</p>",
    editorProps: {
      attributes: {
        class:
          "border rounded-md  border-[#b5b5b5] outline-none w-full md:p-[20px] p-[10px]",
      },
    },
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  return (
    <div className=" flex gap-3 flex-col">
      <ToolBar editor={editor} />
      <EditorContent
        onChange={onChange}
        style={{ whiteSpace: "pre-line" }}
        editor={editor}
      />
    </div>
  );
};

export default Editor;
