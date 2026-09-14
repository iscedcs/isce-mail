"use client";

import React, { useEffect, useState } from "react";
import {
  FileCode2,
  Building2,
  Eye,
  Save,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Sliders,
  Layers,
  HelpCircle,
  Copy,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminLogin } from "@/components/admin/admin-login";
import { getAdminSessionAction } from "@/actions/admin-auth";

interface Product {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
}

interface EmailTemplate {
  id?: string;
  type: string;
  name: string;
  description?: string | null;
  defaultSubject?: string | null;
  previewText?: string | null;
  defaultBanner?: string | null;
  defaultCtaLabel?: string | null;
  defaultCtaUrl?: string | null;
  starterBody?: string | null;
  customProps?: Record<string, any> | null;
  stylingOverrides?: Record<string, any> | null;
  isActive?: boolean;
}

const TEMPLATE_DEFINITIONS = [
  { type: "welcome", name: "Welcome Onboarding", category: "Onboarding", desc: "Sent immediately when users create an account or join." },
  { type: "newsletter", name: "Newsletter Update", category: "Marketing", desc: "Monthly or weekly product digest with stories & updates." },
  { type: "announcement", name: "Important Announcement", category: "Product", desc: "Urgent platform changes, policy notices, or alerts." },
  { type: "appreciation", name: "Member Appreciation", category: "Community", desc: "Thanking users, celebrating loyalty or milestones." },
  { type: "survey", name: "Feedback Survey", category: "Engagement", desc: "Gathers reviews, NPS, or user sentiment." },
  { type: "event", name: "Event Invitation", category: "Events", desc: "Invites subscribers to webinars, AMAs, or meetups." },
  { type: "holiday", name: "Holiday Greetings", category: "Seasonal", desc: "Festive season wishes from the brand leadership." },
  { type: "promotion", name: "Special Promotion", category: "Sales", desc: "Discount codes, flash sales, and special offers." },
  { type: "curriculum", name: "Curriculum Overview", category: "Education", desc: "Detailed syllabus breakdown or downloadable course outline." },
  { type: "course-promo", name: "Course Promotion & Pricing", category: "Education", desc: "Tuition deadlines, limited-seat discounts & early bird." },
  { type: "cohort-welcome", name: "Cohort Welcome & Details", category: "Education", desc: "Essential orientation guide, mentor links & kickoff dates." },
];

export default function AdminTemplatesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; role?: string } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductSlug, setSelectedProductSlug] = useState<string>("");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Editor Modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [currentTpl, setCurrentTpl] = useState<EmailTemplate | null>(null);
  const [savingTpl, setSavingTpl] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Check existing session on mount via Server Action
  useEffect(() => {
    const checkSession = async () => {
      try {
        setAuthChecking(true);
        const data = await getAdminSessionAction();
        if (data.authenticated && data.user) {
          setIsAuthenticated(true);
          setCurrentUser(data.user);
        }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        setAuthChecking(false);
      }
    };
    checkSession();
  }, []);

  // Fetch products
  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        if (data.products && data.products.length > 0) {
          setProducts(data.products);
          if (!selectedProductSlug) {
            setSelectedProductSlug(data.products[0].slug);
          }
        }
      }
    } catch (err) {
      toast.error("Failed to load products list");
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
    }
  }, [isAuthenticated]);

  // Fetch templates whenever selected product changes
  const fetchTemplates = async (slug: string) => {
    if (!slug) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${slug}/templates`);
      if (res.ok) {
        const data = await res.json();
        const serverTemplates: EmailTemplate[] = data.templates || [];

        // Ensure all 11 definitions are represented even if not yet saved in DB
        const merged: EmailTemplate[] = TEMPLATE_DEFINITIONS.map((def) => {
          const found = serverTemplates.find((t) => t.type === def.type);
          if (found) return found;
          return {
            type: def.type,
            name: def.name,
            description: def.desc,
            defaultSubject: `Update from {{companyName}}`,
            previewText: "Read our latest dispatch.",
            defaultCtaLabel: "Learn More",
            defaultCtaUrl: "https://example.com",
            starterBody: "<p>Hello {{firstName}},</p><p>We are excited to share this update with you.</p>",
            isActive: true,
          };
        });

        setTemplates(merged);
      } else {
        toast.error(`Failed to load templates for ${slug}`);
      }
    } catch (err) {
      toast.error("Error communicating with server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProductSlug) {
      fetchTemplates(selectedProductSlug);
    }
  }, [selectedProductSlug]);

  // Live preview loader
  const loadPreview = async (slug: string, tpl: EmailTemplate) => {
    try {
      setPreviewLoading(true);
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tpl.type,
          basis: slug,
          data: {
            message: tpl.starterBody || "<p>Hello {{firstName}}, this is a preview message.</p>",
            ...(tpl.customProps || {}),
          },
        }),
      });

      if (res.ok) {
        const html = await res.text();
        setPreviewHtml(html);
      }
    } catch (err) {
      console.warn("Preview render failed:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Open editor
  const handleEditTemplate = (tpl: EmailTemplate) => {
    setCurrentTpl({
      ...tpl,
      customProps: tpl.customProps || {},
    });
    setEditorOpen(true);
    if (selectedProductSlug) {
      loadPreview(selectedProductSlug, tpl);
    }
  };

  // Save template
  const handleSaveTemplate = async () => {
    if (!currentTpl || !selectedProductSlug) return;

    try {
      setSavingTpl(true);
      const res = await fetch(`/api/products/${selectedProductSlug}/templates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: currentTpl.type,
          name: currentTpl.name,
          description: currentTpl.description,
          defaultSubject: currentTpl.defaultSubject,
          previewText: currentTpl.previewText,
          defaultBanner: currentTpl.defaultBanner || null,
          defaultCtaLabel: currentTpl.defaultCtaLabel,
          defaultCtaUrl: currentTpl.defaultCtaUrl,
          starterBody: currentTpl.starterBody,
          customProps: currentTpl.customProps,
          isActive: currentTpl.isActive ?? true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update template");
      }

      toast.success(`Template "${currentTpl.name}" updated successfully!`);
      fetchTemplates(selectedProductSlug);
      loadPreview(selectedProductSlug, currentTpl);
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setSavingTpl(false);
    }
  };

  const insertToken = (token: string) => {
    if (!currentTpl) return;
    setCurrentTpl({
      ...currentTpl,
      defaultSubject: (currentTpl.defaultSubject || "") + ` ${token}`,
    });
    toast.info(`Inserted ${token}`);
  };

  const selectedProduct = products.find((p) => p.slug === selectedProductSlug);

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-slate-800" />
          Verifying administrator session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50/50">
        <AdminHeader />
        <AdminLogin
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setIsAuthenticated(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <AdminHeader
        currentUser={currentUser}
        onLogout={() => setIsAuthenticated(false)}
        onRefresh={() => {
          fetchProducts();
          if (selectedProductSlug) fetchTemplates(selectedProductSlug);
        }}
        isRefreshing={loading}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8 flex-1">
        {/* Page Title & Product Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <FileCode2 className="h-7 w-7 text-indigo-600" />
              Email Template Defaults
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Configure default subjects, pre-headers, buttons, starter copy, and variables across all 11 email types.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 rounded-xl border shadow-sm">
            <Building2 className="h-4 w-4 text-slate-400 ml-2" />
            <span className="text-xs font-semibold text-slate-600">Product Brand:</span>
            <Select
              value={selectedProductSlug}
              onValueChange={(val) => setSelectedProductSlug(val)}
            >
              <SelectTrigger className="w-[180px] h-9 text-xs font-semibold">
                <SelectValue placeholder="Select Product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.slug} className="text-xs font-medium">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Product Context Banner */}
        {selectedProduct && (
          <div
            className="rounded-xl p-4 text-white flex items-center justify-between shadow-sm transition-colors"
            style={{ backgroundColor: selectedProduct.primaryColor || "#0f172a" }}
          >
            <div className="flex items-center gap-3">
              {selectedProduct.logoUrl ? (
                <div className="h-10 w-10 rounded-lg bg-white/10 backdrop-blur p-1 flex items-center justify-center border border-white/20 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedProduct.logoUrl} alt={selectedProduct.name} className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center font-bold text-lg">
                  {selectedProduct.name.slice(0, 1)}
                </div>
              )}
              <div>
                <h2 className="font-bold text-base">{selectedProduct.name} Templates</h2>
                <p className="text-xs text-white/80">
                  Editing default email behavior for slug: <span className="font-mono">{selectedProduct.slug}</span>
                </p>
              </div>
            </div>

            <Badge variant="outline" className="text-white border-white/40 text-[11px] font-mono">
              11 Dynamic Templates
            </Badge>
          </div>
        )}

        {/* Templates Grid */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-slate-800" />
            <span>Loading template definitions...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => {
              const def = TEMPLATE_DEFINITIONS.find((d) => d.type === tpl.type);
              return (
                <Card
                  key={tpl.type}
                  className="overflow-hidden border hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="text-[10px] uppercase font-mono tracking-wider">
                        {def?.category || "Email"}
                      </Badge>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {tpl.type}
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold text-slate-800">
                      {tpl.name || def?.name || tpl.type}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 line-clamp-2">
                      {tpl.description || def?.desc}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-3 text-xs flex-1">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[10px] font-semibold uppercase text-slate-400 block">Default Subject</span>
                      <p className="font-medium text-slate-700 truncate">
                        {tpl.defaultSubject || "—"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Button Label</span>
                        <span className="font-medium truncate block">{tpl.defaultCtaLabel || "None"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Preview Text</span>
                        <span className="font-medium truncate block">{tpl.previewText || "—"}</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 bg-slate-50/50 border-t flex items-center justify-between gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleEditTemplate(tpl)}
                      className="w-full text-xs font-medium gap-1.5"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      Configure & Preview
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Template Editor & Live Preview Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-5 w-5 text-indigo-600" />
                <span>Configure Template: {currentTpl?.name}</span>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {currentTpl?.type}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Set default values populated into the campaign composer whenever {selectedProduct?.name} uses this template.
            </DialogDescription>
          </DialogHeader>

          {currentTpl && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
              {/* Form Controls (Left 7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <Tabs defaultValue="content" className="w-full">
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="content" className="text-xs">1. Subject & Text</TabsTrigger>
                    <TabsTrigger value="cta" className="text-xs">2. Banner & CTA</TabsTrigger>
                    <TabsTrigger value="params" className="text-xs">3. Custom Props</TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Subject & Content */}
                  <TabsContent value="content" className="space-y-4 pt-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="tpl-name" className="text-xs font-semibold">Template Title</Label>
                      </div>
                      <Input
                        id="tpl-name"
                        value={currentTpl.name}
                        onChange={(e) => setCurrentTpl({ ...currentTpl, name: e.target.value })}
                        className="text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="defaultSubject" className="text-xs font-semibold">Default Subject Line</Label>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground mr-1">Insert:</span>
                          <button
                            type="button"
                            onClick={() => insertToken("{{firstName}}")}
                            className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono text-slate-700"
                          >
                            {"{{firstName}}"}
                          </button>
                          <button
                            type="button"
                            onClick={() => insertToken("{{companyName}}")}
                            className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono text-slate-700"
                          >
                            {"{{companyName}}"}
                          </button>
                        </div>
                      </div>
                      <Input
                        id="defaultSubject"
                        value={currentTpl.defaultSubject || ""}
                        onChange={(e) => setCurrentTpl({ ...currentTpl, defaultSubject: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="previewText" className="text-xs font-semibold">Inbox Preview Text (Pre-header)</Label>
                      <Input
                        id="previewText"
                        value={currentTpl.previewText || ""}
                        onChange={(e) => setCurrentTpl({ ...currentTpl, previewText: e.target.value })}
                        placeholder="Snippet shown in email clients before opening"
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="starterBody" className="text-xs font-semibold">Starter Email Body (HTML / Text)</Label>
                      <Textarea
                        id="starterBody"
                        rows={6}
                        value={currentTpl.starterBody || ""}
                        onChange={(e) => setCurrentTpl({ ...currentTpl, starterBody: e.target.value })}
                        placeholder="<p>Default content template...</p>"
                        className="text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Supports standard HTML tags and token interpolation like {"{{firstName}}"}.
                      </p>
                    </div>
                  </TabsContent>

                  {/* Tab 2: Banner & CTA */}
                  <TabsContent value="cta" className="space-y-4 pt-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="defaultBanner" className="text-xs font-semibold">Default Banner Image URL</Label>
                      <Input
                        id="defaultBanner"
                        value={currentTpl.defaultBanner || ""}
                        onChange={(e) => setCurrentTpl({ ...currentTpl, defaultBanner: e.target.value })}
                        placeholder="https://images.example.com/banner.jpg"
                        className="text-xs"
                      />
                      {currentTpl.defaultBanner && (
                        <div className="mt-2 h-24 rounded-lg border overflow-hidden bg-slate-100 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={currentTpl.defaultBanner}
                            alt="Banner Preview"
                            className="h-full w-full object-cover"
                            onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="defaultCtaLabel" className="text-xs font-semibold">CTA Button Label</Label>
                        <Input
                          id="defaultCtaLabel"
                          value={currentTpl.defaultCtaLabel || ""}
                          onChange={(e) => setCurrentTpl({ ...currentTpl, defaultCtaLabel: e.target.value })}
                          placeholder="e.g. Get Started, View Details"
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="defaultCtaUrl" className="text-xs font-semibold">CTA Button URL</Label>
                        <Input
                          id="defaultCtaUrl"
                          value={currentTpl.defaultCtaUrl || ""}
                          onChange={(e) => setCurrentTpl({ ...currentTpl, defaultCtaUrl: e.target.value })}
                          placeholder="https://..."
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab 3: Type-specific props */}
                  <TabsContent value="params" className="space-y-4 pt-3">
                    {currentTpl.type === "course-promo" && (
                      <div className="space-y-3 bg-slate-50 p-3 rounded-lg border">
                        <p className="text-xs font-bold text-slate-800">Course Promo Parameters</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px]">Original Price</Label>
                            <Input
                              value={currentTpl.customProps?.originalPrice || ""}
                              onChange={(e) =>
                                setCurrentTpl({
                                  ...currentTpl,
                                  customProps: { ...(currentTpl.customProps || {}), originalPrice: e.target.value },
                                })
                              }
                              placeholder="₦150,000"
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">Discount Price</Label>
                            <Input
                              value={currentTpl.customProps?.discountPrice || ""}
                              onChange={(e) =>
                                setCurrentTpl({
                                  ...currentTpl,
                                  customProps: { ...(currentTpl.customProps || {}), discountPrice: e.target.value },
                                })
                              }
                              placeholder="₦89,999"
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px]">Enrollment Deadline</Label>
                          <Input
                            value={currentTpl.customProps?.deadline || ""}
                            onChange={(e) =>
                              setCurrentTpl({
                                ...currentTpl,
                                customProps: { ...(currentTpl.customProps || {}), deadline: e.target.value },
                              })
                            }
                            placeholder="December 31, 2026"
                            className="text-xs h-8"
                          />
                        </div>
                      </div>
                    )}

                    {currentTpl.type === "cohort-welcome" && (
                      <div className="space-y-3 bg-slate-50 p-3 rounded-lg border">
                        <p className="text-xs font-bold text-slate-800">Cohort Welcome Parameters</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px]">Cohort Name</Label>
                            <Input
                              value={currentTpl.customProps?.cohortName || ""}
                              onChange={(e) =>
                                setCurrentTpl({
                                  ...currentTpl,
                                  customProps: { ...(currentTpl.customProps || {}), cohortName: e.target.value },
                                })
                              }
                              placeholder="Cohort 1 — Next-Gen Tech"
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">Start Date</Label>
                            <Input
                              value={currentTpl.customProps?.startDate || ""}
                              onChange={(e) =>
                                setCurrentTpl({
                                  ...currentTpl,
                                  customProps: { ...(currentTpl.customProps || {}), startDate: e.target.value },
                                })
                              }
                              placeholder="January 15, 2026"
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px]">Mentor Name</Label>
                          <Input
                            value={currentTpl.customProps?.mentorName || ""}
                            onChange={(e) =>
                              setCurrentTpl({
                                ...currentTpl,
                                customProps: { ...(currentTpl.customProps || {}), mentorName: e.target.value },
                              })
                            }
                            placeholder="Lead Mentor"
                            className="text-xs h-8"
                          />
                        </div>
                      </div>
                    )}

                    {currentTpl.type !== "course-promo" && currentTpl.type !== "cohort-welcome" && (
                      <div className="py-6 text-center text-xs text-muted-foreground bg-slate-50 rounded-lg border">
                        This template uses standard parameters (Subject, Body, Banner, CTA). No special custom props required.
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (selectedProductSlug && currentTpl) {
                        loadPreview(selectedProductSlug, currentTpl);
                      }
                    }}
                    disabled={previewLoading}
                    className="text-xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${previewLoading ? "animate-spin" : ""}`} />
                    Update Live Preview
                  </Button>

                  <Button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={savingTpl}
                    className="flex-1 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    {savingTpl ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Saving Template...
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        Save Template Defaults
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Live Preview (Right 5 cols) */}
              <div className="lg:col-span-5 border rounded-xl bg-white overflow-hidden flex flex-col h-[520px]">
                <div className="p-3 border-b bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-indigo-600" />
                    Live Brand Preview
                  </span>
                  {previewLoading && (
                    <span className="text-[10px] text-indigo-600 animate-pulse font-mono">
                      Rendering...
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-auto bg-slate-100 p-2">
                  {previewHtml ? (
                    <iframe
                      title="Email Preview"
                      srcDoc={previewHtml}
                      className="w-full h-full border-0 rounded-lg bg-white shadow-sm"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                      Preview not loaded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
