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
import { sendMailAction } from "@/_action/announcement/send-mail";
import { useDraftAutosave } from "@/hooks/useDraftAutosave";
import { AlertCircleIcon, LoaderCircle, Trash2 } from "lucide-react";
import { IBasis } from "@/lib/mail-action/announcement/mail";
import { TooltipContent, TooltipProvider } from "@radix-ui/react-tooltip";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import CSVUploader, { RecipientItem } from "@/components/shared/csv-uploader";
import ConfirmSendDialog from "@/components/shared/confirm-send-dialog";
import PreviewButton from "@/components/shared/preview-button";
import Editor from "@/components/shared/editor-component/editor";

export interface IAnnouncementForm {
  subject: string;
  basis: IBasis;
  message: string;
  image: string;
  emails: string;
  link: string;
}

export default function AnnouncementForm() {
  const [editorContent, setEditorContent] = useState<string>("");
  const [csvContent, setCsvContent] = useState<string>("");
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<IAnnouncementForm>({
    subject: "",
    basis: "ISCE",
    message: "",
    image: "",
    link: "",
    emails: "",
  });
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const { restoreDraft, discardDraft } = useDraftAutosave(
    "announcement-draft",
    form,
    setForm,
  );
  useEffect(() => {
    restoreDraft();
  }, []);
  const [showConfirm, setShowConfirm] = useState(false);
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
    setForm({ subject: "", basis: "ISCE", message: "", image: "", link: "", emails: "" });
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
        <h1 className="text-3xl font-bold">Announcement - Send emails</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Enter your email subject, message and select the basis of your email.
          Attach a CSV file with your recipients&apos; email addresses.
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            onChange={(e) => {
              setForm({
                ...form,
                subject: e.target.value,
              });
            }}
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
                  <AlertCircleIcon className="w-4 h-4 text-[#333] cursor-pointer " />{" "}
                </TooltipTrigger>
                <TooltipContent className=" bg-white border  w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5] ">
                  <p>Select the base for the email.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Select
            defaultValue={form.basis}
            required
            onValueChange={(e: IBasis) => {
              setForm({
                ...form,
                basis: e,
              });
            }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a basis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ISCE">ISCE</SelectItem>
              <SelectItem value="PalmTechniq">PalmTechniq</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 text-[#949494] ">
          <Label htmlFor="image">Image URL </Label>
          <Input
            onChange={(e) => {
              setForm({
                ...form,
                image: e.target.value,
              });
            }}
            id="image"
            disabled
            type="url"
            placeholder="Enter the image link"
            required
            defaultValue={form.image}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex gap-1.5 items-center " htmlFor="link">
            Announcement Link{" "}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircleIcon className="w-4 h-4 text-[#333] cursor-pointer " />{" "}
                </TooltipTrigger>
                <TooltipContent className=" bg-white border  w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5] ">
                  <p>
                    Enter the link that directs users to the reason for the
                    announcement
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            onChange={(e) => {
              setForm({
                ...form,
                link: e.target.value,
              });
            }}
            id="link"
            type="url"
            placeholder="Enter the link "
            required
            defaultValue={form.link}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">Message - Editor</Label>
          <Editor
            defaultValue={(form.message = editorContent)}
            onChange={(e) => {
              return setForm({
                ...form,
                message: e.target.value,
              });
            }}
            setContent={setEditorContent}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex gap-1.5 items-center" htmlFor="emails">
            Email(s){" "}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircleIcon className="w-4 h-4 text-[#333] cursor-pointer " />{" "}
                </TooltipTrigger>
                <TooltipContent className=" bg-white border  w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5] ">
                  <p>Multiple emails are seperated by a comma.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Textarea
            defaultValue={
              !csvContent ? form.emails : (form.emails = csvContent)
            }
            onChange={(e) => {
              setForm({
                ...form,
                emails: e.target.value,
              });
            }}
            id="emails"
            placeholder="Enter email addresses separated by commas"
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="flex gap-1.5 items-center" htmlFor="emails">
            Upload CSV File - If available{" "}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircleIcon className="w-4 h-4 text-[#333] cursor-pointer " />{" "}
                </TooltipTrigger>
                <TooltipContent className=" bg-white border  w-[60%] text-center mx-auto text-[13px] p-[10px] rounded-lg border-[#b5b5b5] ">
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
        {error && <div className="text-destructive ">{error}</div>}
        {success && <div className="text-emerald-600 ">{success}</div>}
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
          type="announcement"
          basis={form.basis}
          data={{ message: form.message, link: form.link }}
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
