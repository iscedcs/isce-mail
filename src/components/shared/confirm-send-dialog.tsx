"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoaderCircle } from "lucide-react";

interface ConfirmSendDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  recipientCount: number;
  subject: string;
  basis: string;
  isPending: boolean;
}

export default function ConfirmSendDialog({
  open,
  onConfirm,
  onCancel,
  recipientCount,
  subject,
  basis,
  isPending,
}: ConfirmSendDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm send</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>You&apos;re about to send this email campaign.</p>
              <ul className="rounded-md border bg-muted/40 p-3 space-y-1">
                <li>
                  <span className="font-medium text-foreground">To: </span>
                  {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
                </li>
                <li>
                  <span className="font-medium text-foreground">Subject: </span>
                  {subject || <em className="opacity-60">No subject</em>}
                </li>
                <li>
                  <span className="font-medium text-foreground">Brand: </span>
                  {basis}
                </li>
              </ul>
              <p className="text-xs text-amber-600">
                This action cannot be undone. Emails will be delivered
                immediately.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <span className="flex items-center gap-2">
                <LoaderCircle className="w-4 h-4 animate-spin" />
                Sending...
              </span>
            ) : (
              `Send to ${recipientCount} recipient${recipientCount !== 1 ? "s" : ""}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
