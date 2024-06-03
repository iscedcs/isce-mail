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
import { useState, useTransition } from "react";
import { sendMailAction } from "@/_action/send-mail";
import { LoaderCircle } from "lucide-react";
import { IBasis } from "@/lib/mail";

export interface IPromotionsForm {
  subject: string;
  basis: IBasis;
  message: string;
  image: string;
  emails: string;
  link: string;
}

export default function PromotionForm() {
  const [form, setForm] = useState<IPromotionsForm>({
    subject: "",
    basis: "ISCE",
    message: "",
    image: "",
    emails: "",
    link: "",
  });
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const sendMail = async () => {
    startTransition(() => {
      sendMailAction(form)
        .then((data) => {
          if (data?.error) {
            setError(data?.error);
          }
          if (data?.success) {
            setSuccess(data?.success);
          }
        })
        .catch(() => setError("Something went wrong!!!"));
    });
  };
  return (
    <form
      action={sendMail}
      className="space-y-4 px-4 md:px-6 max-w-3xl mx-auto py-10"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Promotion - Send emails</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Enter your email subject, message, promotion link, promotion image and
          select the basis of your email. Attach a CSV file with your
          recipients&apos; email addresses.
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
          <Label htmlFor="basis">Basis</Label>
          <Select
            defaultValue={form.basis}
            required
            onValueChange={(e: IBasis) => {
              setForm({
                ...form,
                basis: e,
              });
            }}
          >
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
          <Label htmlFor="image">Image URL </Label>
          <Input
            onChange={(e) => {
              setForm({
                ...form,
                image: e.target.value,
              });
            }}
            id="image"
            type="url"
            placeholder="Enter the image link"
            required
            defaultValue={form.image}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="link">Promotion Link</Label>
          <Input
            onChange={(e) => {
              setForm({
                ...form,
                link: e.target.value,
              });
            }}
            id="link"
            type="url"
            placeholder="Enter the link for promotion"
            required
            defaultValue={form.link}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            onChange={(e) => {
              setForm({
                ...form,
                message: e.target.value,
              });
            }}
            className="min-h-[200px]"
            id="message"
            placeholder="Enter your email message"
            required
            defaultValue={form.message}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emails">Email List</Label>
          <Textarea
            defaultValue={form.emails}
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
        {error && <div className="text-destructive ">{error}</div>}
        {success && <div className="text-emerald-600 ">{success}</div>}
      </div>
      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? (
          <LoaderCircle className="animate-spin h-4 w-4" />
        ) : (
          "Send Emails"
        )}
      </Button>
    </form>
  );
}
