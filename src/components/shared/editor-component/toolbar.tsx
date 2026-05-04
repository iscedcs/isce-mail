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
  ImagePlus,
  Italic,
  Link,
  List,
  ListOrdered,
  LoaderCircle,
  Redo,
  Strikethrough,
  Underline,
  Undo,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface IProps {
  editor: Editor | null;
}

const normalizeImageLink = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.includes("{{") || /^(https?:|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const ToolBar = ({ editor }: IProps) => {
  const iconStyle = "w-4 h-4";
  const defaultStyle =
    "border border-[#333] hover:bg-black hover:text-white bg-white text-black";
  const activeStyle = "bg-black text-white";
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const insertImage = useCallback(
    (src: string, href: string) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: {
            src,
            href: href || null,
          },
        })
        .run();
    },
    [editor],
  );

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

  const insertUrlPlaceholder = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent("{{url}}").run();
  }, [editor]);

  const insertImageByUrl = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Image URL");
    if (!url) return;
    const imageLink = window.prompt(
      "Optional: where should this image link to when clicked?",
      "",
    );
    if (imageLink === null) return;
    const normalizedLink = normalizeImageLink(imageLink);
    insertImage(url, normalizedLink);
  }, [editor, insertImage]);

  const uploadAndInsertImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploadingImage(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? "Upload failed");
        }
        const imageLink = window.prompt(
          "Optional: where should this image link to when clicked?",
          "",
        );
        if (imageLink === null) {
          return;
        }
        const normalizedLink = normalizeImageLink(imageLink);
        insertImage(json.url as string, normalizedLink);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to upload image.";
        window.alert(message);
      } finally {
        setUploadingImage(false);
      }
    },
    [editor, insertImage],
  );

  const handleImageFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void uploadAndInsertImage(file);
      }
      e.target.value = "";
    },
    [uploadAndInsertImage],
  );

  if (!editor) return null;

  return (
    <div className="flex gap-2 border-[#b5b5b5] border py-[10px] rounded-lg flex-wrap justify-center ">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleImageFileChange}
      />

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

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                insertUrlPlaceholder();
              }}
              className={defaultStyle}>
              <Link className={iconStyle} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
            <p>Insert {"{{url}}"} placeholder</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                imageInputRef.current?.click();
              }}
              disabled={uploadingImage}
              className={defaultStyle}>
              {uploadingImage ? (
                <LoaderCircle className={`${iconStyle} animate-spin`} />
              ) : (
                <ImagePlus className={iconStyle} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
            <p>Upload and insert image</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                insertImageByUrl();
              }}
              className={defaultStyle}>
              <ImagePlus className={iconStyle} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
            <p>Insert image by URL</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default ToolBar;
