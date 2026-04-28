"use client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  SelectValue,
  SelectTrigger,
  SelectItem,
  SelectContent,
  Select,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useTransition, useEffect } from "react";
import { sendMailAction } from "@/_action/course-promo/send-mail";
import { useDraftAutosave } from "@/hooks/useDraftAutosave";
import { AlertCircleIcon, LoaderCircle, Trash2 } from "lucide-react";
import { IBasis } from "@/lib/mail-action/course-promo/mail";
import { TooltipContent, TooltipProvider } from "@radix-ui/react-tooltip";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import CSVUploader, { RecipientItem } from "@/components/shared/csv-uploader";
import ConfirmSendDialog from "@/components/shared/confirm-send-dialog";
import PreviewButton from "@/components/shared/preview-button";
import Editor from "@/components/shared/editor-component/editor";
import ImageUploader from "@/components/shared/image-uploader";

export interface ICoursePromoForm {
  subject: string;
  basis: IBasis;
  message: string;
  courseTitle: string;
  originalPrice: string;
  discountPrice: string;
  deadline: string;
  emails: string;
  link: string;
  bannerImage: string;
}

export default function CoursePromoForm() {
  const [csvContent, setCsvContent] = useState<string>("");
  const [editorContent, setEditorContent] = useState<string>("");
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState<ICoursePromoForm>({
    subject: "",
    basis: "ISCE",
    message: "",
    courseTitle: "",
    originalPrice: "",
    discountPrice: "",
    deadline: "",
    emails: "",
    link: "",
    bannerImage: "",
  });

  const { restoreDraft, discardDraft } = useDraftAutosave(
    "course-promo-draft",
    form,
    setForm,
  );
  useEffect(() => {
    restoreDraft();
  }, []);

  const recipientCount =
    recipients.length || form.emails.split(",").filter(Boolean).length;

  const handleSendClick = () => {
    setError(undefined);
    setSuccess(undefined);
    if (recipientCount === 0) {
      setError("Please add at least one recipient before sending.");
      return;
    }
    setShowConfirm(true);
  };

  const confirmSend = () => {
    startTransition(() => {
      sendMailAction({
        ...form,
        recipients: recipients.length ? recipients : undefined,
      })
        .then((data) => {
          if (data?.error) setError(data?.error);
          if (data?.success) setSuccess(data?.success);
        })
        .catch(() => setError("Something went wrong!"))
        .finally(() => setShowConfirm(false));
    });
  };

  const handleDiscard = () => {
    discardDraft();
    setForm({ subject: "", basis: "ISCE", message: "", courseTitle: "", originalPrice: "", discountPrice: "", deadline: "", emails: "", link: "", bannerImage: "" });
    setEditorContent("");
    setCsvContent("");
    setRecipients([]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = text.split("\n").map((row) => row.split(","));
        const trimmedRows = rows.map((row) =>
          row.map((cell) => cell.trim()).join(","),
        );
        const trimmedText = trimmedRows.join(",");
        setCsvContent(trimmedText);
      };
      reader.readAsText(file);
    }
  };

  return (
    <form className="space-y-4 px-4 md:px-6 max-w-3xl mx-auto py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Course Promotion - Send emails</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Promote a course with a limited-time discount. Include the course
          title, original and discounted prices, and an offer deadline.
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            id="subject"
            placeholder="Enter your email subject"
            required
            defaultValue={form.subject}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex gap-1.5 items-center" htmlFor="basis">
            Basis{" "}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircleIcon className="w-4 h-4 text-[#333] cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
                  <p>Select the brand for the email.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Select
            defaultValue={form.basis}
            required
            onValueChange={(e: IBasis) => setForm({ ...form, basis: e })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a basis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ISCE">ISCE</SelectItem>
              <SelectItem value="PalmTechniq">PalmTechniq</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="courseTitle">Course Title</Label>
          <Input
            onChange={(e) => setForm({ ...form, courseTitle: e.target.value })}
            id="courseTitle"
            placeholder="e.g. Full-Stack Web Development Bootcamp"
            required
            defaultValue={form.courseTitle}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="originalPrice">Original Price</Label>
            <Input
              onChange={(e) =>
                setForm({ ...form, originalPrice: e.target.value })
              }
              id="originalPrice"
              placeholder="e.g. ₦50,000"
              defaultValue={form.originalPrice}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discountPrice">Discounted Price</Label>
            <Input
              onChange={(e) =>
                setForm({ ...form, discountPrice: e.target.value })
              }
              id="discountPrice"
              placeholder="e.g. ₦25,000"
              required
              defaultValue={form.discountPrice}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="deadline">
            Offer Deadline{" "}
            <span className="text-gray-400 text-xs">(optional)</span>
          </Label>
          <Input
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            id="deadline"
            placeholder="e.g. December 31, 2025"
            defaultValue={form.deadline}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="link">Enrollment Link</Label>
          <Input
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            id="link"
            type="url"
            placeholder="https://..."
            required
            defaultValue={form.link}
          />
        </div>
        <ImageUploader
          value={form.bannerImage}
          onChange={(url) => setForm({ ...form, bannerImage: url })}
          label="Banner Image (optional)"
        />
        <div className="space-y-2">
          <Label htmlFor="message">Message - Editor</Label>
          <Editor
            defaultValue={(form.message = editorContent)}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            setContent={setEditorContent}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex gap-1.5 items-center" htmlFor="emails">
            Email(s){" "}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircleIcon className="w-4 h-4 text-[#333] cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
                  <p>Multiple emails are separated by a comma.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Textarea
            defaultValue={
              !csvContent ? form.emails : (form.emails = csvContent)
            }
            onChange={(e) => setForm({ ...form, emails: e.target.value })}
            id="emails"
            placeholder="Enter email addresses separated by commas"
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="flex gap-1.5 items-center" htmlFor="csv">
            Upload CSV File - If available{" "}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircleIcon className="w-4 h-4 text-[#333] cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="bg-white border w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5]">
                  <p>Upload a CSV file containing the emails.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <CSVUploader
            handleUpload={handleFileUpload}
            onSyncedCsv={(emailsCsv) => {
              setCsvContent(emailsCsv);
              setForm((prev) => ({ ...prev, emails: emailsCsv }));
            }}
            onSyncedRecipients={setRecipients}
          />
        </div>
        {error && <div className="text-destructive">{error}</div>}
        {success && <div className="text-emerald-600">{success}</div>}
      </div>
      <div className="flex gap-3 items-center">
        <Button
          type="button"
          size="lg"
          onClick={handleSendClick}
          disabled={isPending}>
          {isPending ? (
            <LoaderCircle className="animate-spin h-4 w-4" />
          ) : recipientCount > 0 ? (
            `Send to ${recipientCount} recipient${recipientCount !== 1 ? "s" : ""}`
          ) : (
            "Send Emails"
          )}
        </Button>
        <PreviewButton
          type="course-promo"
          basis={form.basis}
          data={{
            message: form.message,
            link: form.link,
            courseTitle: form.courseTitle,
            originalPrice: form.originalPrice,
            discountPrice: form.discountPrice,
            deadline: form.deadline,
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDiscard}
          className="text-muted-foreground hover:text-destructive gap-1.5">
          <Trash2 className="w-3.5 h-3.5" />
          Discard draft
        </Button>
      </div>
      <ConfirmSendDialog
        open={showConfirm}
        onConfirm={confirmSend}
        onCancel={() => setShowConfirm(false)}
        recipientCount={recipientCount}
        subject={form.subject}
        basis={form.basis}
        isPending={isPending}
      />
    </form>
  );
}
