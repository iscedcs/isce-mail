import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Editor } from "@tiptap/react";
import {
  Bold,
  Link,
  Strikethrough,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Underline,
  Quote,
  Undo,
  Redo,
  Code,
  Copy,
} from "lucide-react";
import { useCallback } from "react";

interface IProps {
  editor: Editor | null;
}

const ToolBar = ({ editor }: IProps) => {
  const iconStyle = "w-4 h-4";
  const defaultStyle =
    "border border-[#333] hover:bg-black hover:text-white bg-white text-black";
  const activeStyle = "bg-black text-white";

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    // empty
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // cancelled
    if (url === null) {
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex gap-2 border-[#b5b5b5] border py-[10px] rounded-lg flex-wrap justify-center ">
      <Button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleBold().run();
        }}
        className={`${editor.isActive("bold") ? activeStyle : defaultStyle}`}
      >
        <Bold className={iconStyle} />
      </Button>

      <Button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleItalic().run();
        }}
        className={`${editor.isActive("italic") ? activeStyle : defaultStyle}`}
      >
        <Italic className={iconStyle} />
      </Button>

      <Button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleUnderline().run();
        }}
        className={`${
          editor.isActive("underline") ? activeStyle : defaultStyle
        }`}
      >
        <Underline className={iconStyle} />
      </Button>

      <Button
        onClick={(e) => {
          e.preventDefault();
          setLink();
        }}
        className={`${editor.isActive("link") ? activeStyle : defaultStyle}`}
      >
        <Link className={iconStyle} />
      </Button>

      <Button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleStrike().run();
        }}
        className={`${editor.isActive("strike") ? activeStyle : defaultStyle}`}
      >
        <Strikethrough className={iconStyle} />
      </Button>

      <Button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleHeading({ level: 1 }).run();
        }}
        className={`${
          editor.isActive("heading", { level: 1 }) ? activeStyle : defaultStyle
        }`}
      >
        <Heading1 className={iconStyle} />
      </Button>

      <Button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleHeading({ level: 2 }).run();
        }}
        className={`${
          editor.isActive("heading", { level: 2 }) ? activeStyle : defaultStyle
        }`}
      >
        <Heading2 className={iconStyle} />
      </Button>

      <Button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleBulletList().run();
        }}
        className={`${
          editor.isActive("bulletList") ? activeStyle : defaultStyle
        }`}
      >
        <List className={iconStyle} />
      </Button>

      <Button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleOrderedList().run();
        }}
        className={`${
          editor.isActive("orderedList") ? activeStyle : defaultStyle
        }`}
      >
        <ListOrdered className={iconStyle} />
      </Button>

      <Button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().undo().run();
        }}
        className={`${editor.isActive("undo") ? activeStyle : defaultStyle}`}
      >
        <Undo className={iconStyle} />
      </Button>

      <Button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().redo().run();
        }}
        className={`${editor.isActive("redo") ? activeStyle : defaultStyle}`}
      >
        <Redo className={iconStyle} />
      </Button>
    </div>
  );
};

export default ToolBar;
