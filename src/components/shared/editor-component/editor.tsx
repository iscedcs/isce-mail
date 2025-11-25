"use client";
import { Color } from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import ListItem from "@tiptap/extension-list-item";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ChangeEvent, Dispatch, SetStateAction } from "react";
import ToolBar from "./toolbar";

interface IEditorProps {
  setContent: Dispatch<SetStateAction<string>>;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  defaultValue?: string;
}

const Editor = ({ setContent, onChange }: IEditorProps) => {
  const editor = useEditor({
    extensions: [
      Underline,
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
