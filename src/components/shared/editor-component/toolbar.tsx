import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Editor } from "@tiptap/react";
import {
  AtSign,
  Bold,
  Heading1,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  Redo,
  Strikethrough,
  Underline,
  Undo,
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

  const insertFirstnamePlaceholder = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent("{{firstname}}").run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex gap-2 border-[#b5b5b5] border py-[10px] rounded-lg flex-wrap justify-center ">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleBold().run();
              }}
              className={`${
                editor.isActive("bold") ? activeStyle : defaultStyle
              }`}>
              <Bold className={iconStyle} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
            <p>Toggle bold text</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleItalic().run();
              }}
              className={`${
                editor.isActive("italic") ? activeStyle : defaultStyle
              }`}>
              <Italic className={iconStyle} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
            <p>Toggle italic text</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleUnderline().run();
              }}
              className={`${
                editor.isActive("underline") ? activeStyle : defaultStyle
              }`}>
              <Underline className={iconStyle} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
            <p>Toggle underline text</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                setLink();
              }}
              className={`${
                editor.isActive("link") ? activeStyle : defaultStyle
              }`}>
              <Link className={iconStyle} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
            <p>Add or edit a link</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleStrike().run();
              }}
              className={`${
                editor.isActive("strike") ? activeStyle : defaultStyle
              }`}>
              <Strikethrough className={iconStyle} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
            <p>Toggle strikethrough text</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleHeading({ level: 1 }).run();
              }}
              className={`${
                editor.isActive("heading", { level: 1 })
                  ? activeStyle
                  : defaultStyle
              }`}>
              <Heading1 className={iconStyle} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
            <p>Toggle heading 1</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleHeading({ level: 2 }).run();
              }}
              className={`${
                editor.isActive("heading", { level: 2 })
                  ? activeStyle
                  : defaultStyle
              }`}>
              <Heading2 className={iconStyle} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
            <p>Toggle heading 2</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleBulletList().run();
              }}
              className={`${
                editor.isActive("bulletList") ? activeStyle : defaultStyle
              }`}>
              <List className={iconStyle} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
            <p>Toggle bullet list</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleOrderedList().run();
              }}
              className={`${
                editor.isActive("orderedList") ? activeStyle : defaultStyle
              }`}>
              <ListOrdered className={iconStyle} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
            <p>Toggle numbered list</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                editor.chain().focus().undo().run();
              }}
              className={`${
                editor.isActive("undo") ? activeStyle : defaultStyle
              }`}>
              <Undo className={iconStyle} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
            <p>Undo last action</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                editor.chain().focus().redo().run();
              }}
              className={`${
                editor.isActive("redo") ? activeStyle : defaultStyle
              }`}>
              <Redo className={iconStyle} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
            <p>Redo last action</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                insertFirstnamePlaceholder();
              }}
              className={defaultStyle}>
              <AtSign className={iconStyle} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
            <p>Insert {"{{firstname}}"} placeholder</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default ToolBar;
