"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { resetPasswordAction } from "@/actions/admin-auth";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      setErrorMsg("Reset token is missing. Please use the link sent to your email.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg("");

      const res = await resetPasswordAction({
        token: token.trim(),
        newPassword: newPassword.trim(),
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to reset password.");
      }

      setIsSuccess(true);
      toast.success(res.message || "Password updated successfully!");

      // Redirect to admin dashboard after short delay
      setTimeout(() => {
        router.push("/admin/products");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset password.");
      toast.error(err.message || "Password reset failed.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md shadow-xl border-slate-200/80 bg-white text-center p-8 space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl font-bold text-slate-900">Password Reset Complete</CardTitle>
        <p className="text-xs text-slate-600">
          Your administrator password has been updated. Redirecting you to the admin console...
        </p>
        <Button
          onClick={() => router.push("/admin/products")}
          className="w-full bg-slate-900 text-white text-xs mt-2"
        >
          Go to Admin Products Now
        </Button>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-slate-200/80 bg-white">
      <CardHeader className="text-center space-y-2 pb-6">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
          Set New Password
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 max-w-xs mx-auto">
          Choose a new password for your administrator account.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
              <span className="font-semibold">Error:</span> {errorMsg}
            </div>
          )}

          {!tokenFromUrl && (
            <div className="space-y-1.5">
              <Label htmlFor="token" className="text-xs font-semibold text-slate-700">
                Reset Token
              </Label>
              <Input
                id="token"
                type="text"
                placeholder="Paste token from email"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="text-xs font-mono"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs font-semibold text-slate-700">
              New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-9 pr-10 text-sm"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs font-semibold text-slate-700">
              Confirm New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9 pr-10 text-sm"
                required
                minLength={6}
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2 pb-6 flex flex-col gap-3">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving New Password...
              </>
            ) : (
              "Save New Password"
            )}
          </Button>

          <Link
            href="/admin/products"
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Login
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs text-slate-500">Loading reset form...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
