"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Building2,
  Mail,
  ShieldCheck,
  Globe,
  Settings2,
  ExternalLink,
  RefreshCw,
  Palette,
  Eye,
  FileEdit,
  Sliders,
  CheckCircle2,
  Loader2,
  FileCode2,
  Zap,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminLogin } from "@/components/admin/admin-login";
import { getAdminSessionAction } from "@/actions/admin-auth";

type EmailLayout = {
  headerStyle?: "logo-banner" | "logo-only";
  footerStyle?: "dark" | "light";
  socialLayout?: "left" | "center";
  socialIconSize?: 18 | 23 | 28;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  senderName: string;
  senderEmail: string;
  replyToEmail: string | null;
  logoUrl: string;
  websiteUrl: string;
  primaryColor: string;
  accentColor: string;
  buttonTextColor: string;
  buttonRadius: string;
  supportEmail: string | null;
  unsubscribeEmail: string | null;
  address: string | null;
  socialLinks: Record<string, string> | null;
  syncUrl: string | null;
  isActive: boolean;
  createdAt: string;
  planTier?: string;
  dailyQuota?: number;
  emailLayout?: EmailLayout | null;
  _count?: {
    campaigns: number;
    templates: number;
  };
};

type EmailTemplate = {
  id: string;
  type: string;
  name: string;
  description: string | null;
  defaultSubject: string | null;
  previewText: string | null;
  defaultBanner: string | null;
  defaultCtaLabel: string | null;
  defaultCtaUrl: string | null;
  starterBody: string | null;
  customProps: Record<string, any> | null;
  isActive?: boolean;
};

export default function AdminProductsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; role?: string } | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Onboard modal state
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [savingOnboard, setSavingOnboard] = useState(false);
  const [formStep, setFormStep] = useState<"basics" | "sender" | "branding" | "footer" | "sync">("basics");

  const [newProduct, setNewProduct] = useState({
    name: "",
    slug: "",
    description: "",
    senderName: "",
    senderEmail: "",
    replyToEmail: "",
    resendApiKey: "",
    webhookSecret: "",
    logoUrl: "",
    websiteUrl: "",
    primaryColor: "#000000",
    accentColor: "#2563eb",
    buttonTextColor: "#ffffff",
    buttonRadius: "full",
    supportEmail: "",
    unsubscribeEmail: "",
    address: "",
    syncUrl: "",
    syncApiKey: "",
    socialLinkedin: "",
    socialTwitter: "",
    socialInstagram: "",
    planTier: "free",
    dailyQuota: 100,
  });

  // Edit Product modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editStep, setEditStep] = useState<"basics" | "sender" | "branding" | "footer" | "sync">("basics");
  const [editData, setEditData] = useState<any>({});

  // Template customizer state
  const [selectedProductForTemplates, setSelectedProductForTemplates] = useState<Product | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Email Layout editor state
  const [layoutProduct, setLayoutProduct] = useState<Product | null>(null);
  const [layoutModalOpen, setLayoutModalOpen] = useState(false);
  const [layoutConfig, setLayoutConfig] = useState<EmailLayout>({});
  const [savingLayout, setSavingLayout] = useState(false);
  const [layoutPreviewHtml, setLayoutPreviewHtml] = useState<string>("");
  const [layoutPreviewLoading, setLayoutPreviewLoading] = useState(false);
  const [layoutPreviewType, setLayoutPreviewType] = useState<string>("newsletter");

  // Check admin session on mount via Server Action
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
      setIsRefreshing(true);
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        if (data.products) {
          setProducts(data.products);
        }
      } else {
        toast.error("Failed to load products list");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error communicating with server");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
    }
  }, [isAuthenticated]);

  // Open Edit Product Modal
  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setEditStep("basics");
    setEditData({
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      senderName: product.senderName,
      senderEmail: product.senderEmail,
      replyToEmail: product.replyToEmail || "",
      resendApiKey: "", // blank indicates leave unchanged
      webhookSecret: "", // blank indicates leave unchanged
      logoUrl: product.logoUrl,
      websiteUrl: product.websiteUrl,
      primaryColor: product.primaryColor || "#000000",
      accentColor: product.accentColor || "#2563eb",
      buttonTextColor: product.buttonTextColor || "#ffffff",
      buttonRadius: product.buttonRadius || "full",
      supportEmail: product.supportEmail || "",
      unsubscribeEmail: product.unsubscribeEmail || "",
      address: product.address || "",
      syncUrl: product.syncUrl || "",
      syncApiKey: "", // blank indicates leave unchanged
      socialLinkedin: product.socialLinks?.linkedin || "",
      socialTwitter: product.socialLinks?.twitter || "",
      socialInstagram: product.socialLinks?.instagram || "",
      socialFacebook: product.socialLinks?.facebook || "",
      socialSlack: product.socialLinks?.slack || "",
      socialYoutube: product.socialLinks?.youtube || "",
      planTier: product.planTier || "free",
      dailyQuota: product.dailyQuota || 100,
      isActive: product.isActive,
    });
    setEditOpen(true);
  };

  // Submit Product Updates
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editData.name || !editData.senderName || !editData.senderEmail) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setSavingEdit(true);
      const socialLinks: Record<string, string> = {};
      if (editData.socialLinkedin) socialLinks.linkedin = editData.socialLinkedin;
      if (editData.socialTwitter) socialLinks.twitter = editData.socialTwitter;
      if (editData.socialInstagram) socialLinks.instagram = editData.socialInstagram;
      if (editData.socialFacebook) socialLinks.facebook = editData.socialFacebook;
      if (editData.socialSlack) socialLinks.slack = editData.socialSlack;
      if (editData.socialYoutube) socialLinks.youtube = editData.socialYoutube;

      const payload: any = {
        name: editData.name,
        description: editData.description || null,
        senderName: editData.senderName,
        senderEmail: editData.senderEmail,
        replyToEmail: editData.replyToEmail || null,
        logoUrl: editData.logoUrl,
        websiteUrl: editData.websiteUrl,
        primaryColor: editData.primaryColor,
        accentColor: editData.accentColor,
        buttonTextColor: editData.buttonTextColor,
        buttonRadius: editData.buttonRadius,
        supportEmail: editData.supportEmail || null,
        unsubscribeEmail: editData.unsubscribeEmail || null,
        address: editData.address || null,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : null,
        syncUrl: editData.syncUrl || null,
        planTier: editData.planTier || "free",
        dailyQuota: Number(editData.dailyQuota) || 100,
        isActive: Boolean(editData.isActive),
      };

      if (editData.resendApiKey && editData.resendApiKey.trim()) {
        payload.resendApiKey = editData.resendApiKey.trim();
      }
      if (editData.webhookSecret && editData.webhookSecret.trim()) {
        payload.webhookSecret = editData.webhookSecret.trim();
      }
      if (editData.syncApiKey && editData.syncApiKey.trim()) {
        payload.syncApiKey = editData.syncApiKey.trim();
      }

      const res = await fetch(`/api/products/${editingProduct.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update product");
      }

      toast.success(`Product "${editData.name}" updated successfully!`);
      setEditOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setSavingEdit(false);
    }
  };

  // Submit New Product Onboarding
  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.senderName || !newProduct.senderEmail) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!newProduct.resendApiKey.trim()) {
      toast.error("Resend API Key is required for product isolation.");
      return;
    }

    try {
      setSavingOnboard(true);
      const socialLinks: Record<string, string> = {};
      if (newProduct.socialLinkedin) socialLinks.linkedin = newProduct.socialLinkedin;
      if (newProduct.socialTwitter) socialLinks.twitter = newProduct.socialTwitter;
      if (newProduct.socialInstagram) socialLinks.instagram = newProduct.socialInstagram;

      const payload = {
        name: newProduct.name,
        slug: newProduct.slug || undefined,
        description: newProduct.description || undefined,
        senderName: newProduct.senderName,
        senderEmail: newProduct.senderEmail,
        replyToEmail: newProduct.replyToEmail || undefined,
        resendApiKey: newProduct.resendApiKey,
        webhookSecret: newProduct.webhookSecret || undefined,
        logoUrl: newProduct.logoUrl,
        websiteUrl: newProduct.websiteUrl,
        primaryColor: newProduct.primaryColor,
        accentColor: newProduct.accentColor,
        buttonTextColor: newProduct.buttonTextColor,
        buttonRadius: newProduct.buttonRadius,
        supportEmail: newProduct.supportEmail || undefined,
        unsubscribeEmail: newProduct.unsubscribeEmail || undefined,
        address: newProduct.address || undefined,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
        syncUrl: newProduct.syncUrl || undefined,
        syncApiKey: newProduct.syncApiKey || undefined,
        planTier: newProduct.planTier || "free",
        dailyQuota: Number(newProduct.dailyQuota) || 100,
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to onboard product");
      }

      toast.success(`Product "${data.product.name}" successfully onboarded!`);
      setOnboardOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to onboard product");
    } finally {
      setSavingOnboard(false);
    }
  };

  // Open Template Customizer
  const openTemplateCustomizer = async (product: Product) => {
    setSelectedProductForTemplates(product);
    setTemplateModalOpen(true);
    try {
      const res = await fetch(`/api/products/${product.slug}/templates`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
        if (data.templates && data.templates.length > 0) {
          setSelectedTemplate(data.templates[0]);
          loadLivePreview(product.slug, data.templates[0]);
        }
      }
    } catch (err) {
      toast.error("Could not fetch templates for product");
    }
  };

  const loadLivePreview = async (slug: string, tpl: EmailTemplate) => {
    try {
      setPreviewLoading(true);
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tpl.type,
          basis: slug,
          data: {
            message: tpl.starterBody || "<p>Hello {{firstName}}, welcome to our dynamic mailing platform!</p>",
            ...(tpl.customProps || {}),
          },
        }),
      });
      if (res.ok) {
        const html = await res.text();
        setPreviewHtml(html);
      }
    } catch (err) {
      console.warn("Preview error:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const saveTemplateChanges = async () => {
    if (!selectedProductForTemplates || !selectedTemplate) return;
    try {
      setSavingTemplate(true);
      const res = await fetch(`/api/products/${selectedProductForTemplates.slug}/templates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedTemplate.type,
          name: selectedTemplate.name,
          description: selectedTemplate.description,
          defaultSubject: selectedTemplate.defaultSubject,
          previewText: selectedTemplate.previewText,
          defaultBanner: selectedTemplate.defaultBanner || null,
          defaultCtaLabel: selectedTemplate.defaultCtaLabel,
          defaultCtaUrl: selectedTemplate.defaultCtaUrl,
          starterBody: selectedTemplate.starterBody,
          customProps: selectedTemplate.customProps,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update template");
      }
      toast.success("Template settings updated!");
      loadLivePreview(selectedProductForTemplates.slug, selectedTemplate);
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  };

  // Open Layout Editor
  const openLayoutEditor = (product: Product) => {
    setLayoutProduct(product);
    setLayoutConfig(product.emailLayout ?? {});
    setLayoutModalOpen(true);
    loadLayoutPreview(product.slug, product.emailLayout ?? {}, layoutPreviewType);
  };

  const loadLayoutPreview = async (slug: string, cfg: EmailLayout, previewType = "newsletter") => {
    try {
      setLayoutPreviewLoading(true);
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: previewType,
          basis: slug,
          layoutOverride: cfg,
          data: {
            message: "<p>This is a live layout preview showing your header, footer, and social icons configuration.</p>",
          },
        }),
      });
      if (res.ok) {
        const html = await res.text();
        setLayoutPreviewHtml(html);
      }
    } catch (err) {
      console.warn("Layout preview error:", err);
    } finally {
      setLayoutPreviewLoading(false);
    }
  };

  const saveLayout = async () => {
    if (!layoutProduct) return;
    try {
      setSavingLayout(true);
      const res = await fetch(`/api/products/${layoutProduct.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailLayout: layoutConfig }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save layout");
      }
      toast.success(`Email layout saved for ${layoutProduct.name}!`);
      setLayoutModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to save layout");
    } finally {
      setSavingLayout(false);
    }
  };

  const updateLayoutConfig = (updates: Partial<EmailLayout>) => {
    const next = { ...layoutConfig, ...updates };
    setLayoutConfig(next);
    if (layoutProduct) loadLayoutPreview(layoutProduct.slug, next, layoutPreviewType);
  };

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
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <AdminHeader />
        <AdminLogin
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setIsAuthenticated(true);
            fetchProducts();
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
        onRefresh={fetchProducts}
        isRefreshing={isRefreshing}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8 flex-1">
        {/* Top Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Building2 className="h-7 w-7 text-emerald-600" />
              Brand & Multi-Tenant Management
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Manage isolated brand identities, sender credentials, layout styling, and email template configurations.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/admin/templates">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <FileCode2 className="h-4 w-4 text-indigo-600" />
                Templates Hub
              </Button>
            </Link>

            <Button onClick={() => setOnboardOpen(true)} className="gap-1.5 text-xs shadow-sm bg-slate-900 hover:bg-slate-800 text-white">
              <PlusCircle className="h-4 w-4" />
              Onboard Product
            </Button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-blue-900 text-xs sm:text-sm flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold text-xs sm:text-sm">Isolated Multi-Tenant Security & Tenant Decoupling</p>
            <p className="text-blue-800/90 text-xs leading-relaxed">
              Every brand (e.g. <strong>Gada</strong>, <strong>PalmTechnIQ</strong>, <strong>ISCE</strong>) maintains complete isolation. Resend API credentials, sending quotas, and webhook secrets are encrypted at rest using AES-256-GCM.
            </p>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-slate-800" />
            <span>Loading brand configurations...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-white rounded-xl border p-8">
            <p className="text-base font-medium">No products onboarded yet.</p>
            <p className="text-sm text-muted-foreground">Click &quot;Onboard Product&quot; to add your first brand.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <Card key={p.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  {/* Brand Header Banner */}
                  <div
                    className="h-20 w-full p-4 flex items-center justify-between text-white transition-colors"
                    style={{ backgroundColor: p.primaryColor || "#0f172a" }}
                  >
                    <div className="flex items-center gap-3">
                      {p.logoUrl ? (
                        <div className="h-10 w-10 rounded-lg bg-white/10 backdrop-blur p-1 flex items-center justify-center overflow-hidden border border-white/20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.logoUrl} alt={p.name} className="h-full w-full object-contain" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center font-bold text-lg">
                          {p.name.slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-base leading-tight text-white">{p.name}</h3>
                        <p className="text-xs text-white/80 font-mono">slug: {p.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-white/20 text-white text-[10px] border-none capitalize">
                        {p.planTier || "free"} • {(p.dailyQuota || 100).toLocaleString()}/day
                      </Badge>
                      <Badge variant={p.isActive ? "default" : "secondary"} className="bg-white/20 text-white text-[10px] border-none uppercase">
                        {p.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-4 text-sm">
                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                    )}

                    <div className="space-y-2 pt-1 border-t">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-amber-500" /> Plan & Quota
                        </span>
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase">
                            {p.planTier || "free"}
                          </span>
                          {(p.dailyQuota || 100).toLocaleString()} emails/day
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" /> Sender
                        </span>
                        <span className="font-medium text-slate-800 truncate max-w-[180px]">
                          {p.senderName} &lt;{p.senderEmail}&gt;
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5" /> Website
                        </span>
                        <a
                          href={p.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-medium truncate max-w-[180px]"
                        >
                          {p.websiteUrl.replace(/^https?:\/\//, "")}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Palette className="h-3.5 w-3.5" /> Brand Colors
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-4 w-4 rounded-full border shadow-sm inline-block"
                            style={{ backgroundColor: p.primaryColor }}
                            title={`Primary: ${p.primaryColor}`}
                          />
                          <span
                            className="h-4 w-4 rounded-full border shadow-sm inline-block"
                            style={{ backgroundColor: p.accentColor }}
                            title={`Accent: ${p.accentColor}`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-muted-foreground block text-[10px]">Campaigns</span>
                        <span className="font-bold text-sm text-slate-800">{p._count?.campaigns ?? 0}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-muted-foreground block text-[10px]">Templates</span>
                        <span className="font-bold text-sm text-slate-800">{p._count?.templates ?? 11}</span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="p-3 bg-slate-50/50 border-t flex flex-wrap items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 text-xs gap-1 bg-slate-900 hover:bg-slate-800 text-white"
                    onClick={() => openEditProductModal(p)}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1"
                    onClick={() => openTemplateCustomizer(p)}
                  >
                    <FileEdit className="h-3.5 w-3.5" />
                    Templates
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1"
                    onClick={() => openLayoutEditor(p)}
                  >
                    <Palette className="h-3.5 w-3.5" />
                    Layout
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* ── Edit Product Dialog ── */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                Edit Product: {editingProduct?.name}
              </DialogTitle>
              <DialogDescription>
                Update brand identity, sending email, API keys, brand colors, and integrations.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditSubmit} className="space-y-6 pt-2">
              <Tabs value={editStep} onValueChange={(v: any) => setEditStep(v)} className="w-full">
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="basics" className="text-xs">1. Identity</TabsTrigger>
                  <TabsTrigger value="sender" className="text-xs">2. Resend Key</TabsTrigger>
                  <TabsTrigger value="branding" className="text-xs">3. Styling</TabsTrigger>
                  <TabsTrigger value="footer" className="text-xs">4. Legal</TabsTrigger>
                  <TabsTrigger value="sync" className="text-xs">5. Sync</TabsTrigger>
                </TabsList>

                {/* Step 1: Basics */}
                <TabsContent value="basics" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Product Name *</Label>
                    <Input
                      id="edit-name"
                      value={editData.name || ""}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-slug">Slug (Permanent Identifier)</Label>
                    <Input
                      id="edit-slug"
                      value={editData.slug || ""}
                      disabled
                      className="bg-slate-100 font-mono text-xs cursor-not-allowed"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Product slug cannot be changed because campaign references and API paths depend on it.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-desc">Description</Label>
                    <Textarea
                      id="edit-desc"
                      rows={2}
                      value={editData.description || ""}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-planTier">Plan Tier</Label>
                      <Select
                        value={editData.planTier || "free"}
                        onValueChange={(val) => {
                          const quotaMap: Record<string, number> = {
                            free: 100,
                            starter: 500,
                            growth: 2500,
                            enterprise: 10000,
                          };
                          setEditData({
                            ...editData,
                            planTier: val,
                            dailyQuota: quotaMap[val] || editData.dailyQuota || 100,
                          });
                        }}
                      >
                        <SelectTrigger id="edit-planTier" className="text-xs">
                          <SelectValue placeholder="Select plan tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free (100 emails/day)</SelectItem>
                          <SelectItem value="starter">Starter (500 emails/day)</SelectItem>
                          <SelectItem value="growth">Growth (2,500 emails/day)</SelectItem>
                          <SelectItem value="enterprise">Enterprise (10,000 emails/day)</SelectItem>
                          <SelectItem value="custom">Custom Quota</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-dailyQuota">Daily Dispatch Quota</Label>
                      <Input
                        id="edit-dailyQuota"
                        type="number"
                        min="1"
                        max="1000000"
                        value={editData.dailyQuota || 100}
                        onChange={(e) => setEditData({ ...editData, dailyQuota: Number(e.target.value) })}
                        disabled={Boolean(editData.planTier && editData.planTier !== "custom")}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Emails dispatched in each daily batch.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                    <div>
                      <Label htmlFor="edit-active" className="text-xs font-semibold block">Active Status</Label>
                      <p className="text-[11px] text-muted-foreground">When disabled, campaigns cannot be dispatched from this brand.</p>
                    </div>
                    <Switch
                      id="edit-active"
                      checked={Boolean(editData.isActive)}
                      onCheckedChange={(checked) => setEditData({ ...editData, isActive: checked })}
                    />
                  </div>

                  <Button type="button" size="sm" onClick={() => setEditStep("sender")} className="w-full">
                    Next: Sender & API Credentials &rarr;
                  </Button>
                </TabsContent>

                {/* Step 2: Sender & Resend Key */}
                <TabsContent value="sender" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-senderName">Sender Display Name *</Label>
                    <Input
                      id="edit-senderName"
                      value={editData.senderName || ""}
                      onChange={(e) => setEditData({ ...editData, senderName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-senderEmail">Sender Email *</Label>
                      <Input
                        id="edit-senderEmail"
                        type="email"
                        value={editData.senderEmail || ""}
                        onChange={(e) => setEditData({ ...editData, senderEmail: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-replyToEmail">Reply-To Email</Label>
                      <Input
                        id="edit-replyToEmail"
                        type="email"
                        value={editData.replyToEmail || ""}
                        onChange={(e) => setEditData({ ...editData, replyToEmail: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-resendApiKey">Resend API Key (AES-256 Encrypted)</Label>
                    <Input
                      id="edit-resendApiKey"
                      type="password"
                      placeholder="•••••••••••••••• (Leave blank to keep existing key)"
                      value={editData.resendApiKey || ""}
                      onChange={(e) => setEditData({ ...editData, resendApiKey: e.target.value })}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Only enter a new value if you wish to rotate or replace the existing Resend API key.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-webhookSecret">Resend Webhook Secret (Optional)</Label>
                    <Input
                      id="edit-webhookSecret"
                      type="password"
                      placeholder="•••••••••••••••• (Leave blank to keep existing)"
                      value={editData.webhookSecret || ""}
                      onChange={(e) => setEditData({ ...editData, webhookSecret: e.target.value })}
                    />
                  </div>

                  <Button type="button" size="sm" onClick={() => setEditStep("branding")} className="w-full">
                    Next: Brand Styling &rarr;
                  </Button>
                </TabsContent>

                {/* Step 3: Branding */}
                <TabsContent value="branding" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-logoUrl">Logo Image URL</Label>
                    <Input
                      id="edit-logoUrl"
                      value={editData.logoUrl || ""}
                      onChange={(e) => setEditData({ ...editData, logoUrl: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-websiteUrl">Official Website URL</Label>
                    <Input
                      id="edit-websiteUrl"
                      value={editData.websiteUrl || ""}
                      onChange={(e) => setEditData({ ...editData, websiteUrl: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-primaryColor">Primary Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="edit-primaryColor"
                          value={editData.primaryColor || "#000000"}
                          onChange={(e) => setEditData({ ...editData, primaryColor: e.target.value })}
                          className="h-9 w-12 rounded cursor-pointer border"
                        />
                        <Input
                          value={editData.primaryColor || ""}
                          onChange={(e) => setEditData({ ...editData, primaryColor: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-accentColor">Accent Color (CTA Buttons)</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="edit-accentColor"
                          value={editData.accentColor || "#2563eb"}
                          onChange={(e) => setEditData({ ...editData, accentColor: e.target.value })}
                          className="h-9 w-12 rounded cursor-pointer border"
                        />
                        <Input
                          value={editData.accentColor || ""}
                          onChange={(e) => setEditData({ ...editData, accentColor: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="button" size="sm" onClick={() => setEditStep("footer")} className="w-full">
                    Next: Legal & Social &rarr;
                  </Button>
                </TabsContent>

                {/* Step 4: Legal & Social */}
                <TabsContent value="footer" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-address">Physical Mailing Address</Label>
                    <Input
                      id="edit-address"
                      value={editData.address || ""}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-supportEmail">Support Email</Label>
                      <Input
                        id="edit-supportEmail"
                        value={editData.supportEmail || ""}
                        onChange={(e) => setEditData({ ...editData, supportEmail: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-unsubscribeEmail">Unsubscribe Email</Label>
                      <Input
                        id="edit-unsubscribeEmail"
                        value={editData.unsubscribeEmail || ""}
                        onChange={(e) => setEditData({ ...editData, unsubscribeEmail: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Social Channels</Label>
                    <Input
                      placeholder="LinkedIn URL"
                      value={editData.socialLinkedin || ""}
                      onChange={(e) => setEditData({ ...editData, socialLinkedin: e.target.value })}
                      className="text-xs mb-2"
                    />
                    <Input
                      placeholder="Twitter / X URL"
                      value={editData.socialTwitter || ""}
                      onChange={(e) => setEditData({ ...editData, socialTwitter: e.target.value })}
                      className="text-xs mb-2"
                    />
                    <Input
                      placeholder="Instagram URL"
                      value={editData.socialInstagram || ""}
                      onChange={(e) => setEditData({ ...editData, socialInstagram: e.target.value })}
                      className="text-xs mb-2"
                    />
                    <Input
                      placeholder="Facebook URL"
                      value={editData.socialFacebook || ""}
                      onChange={(e) => setEditData({ ...editData, socialFacebook: e.target.value })}
                      className="text-xs mb-2"
                    />
                    <Input
                      placeholder="Slack Community URL"
                      value={editData.socialSlack || ""}
                      onChange={(e) => setEditData({ ...editData, socialSlack: e.target.value })}
                      className="text-xs"
                    />
                  </div>

                  <Button type="button" size="sm" onClick={() => setEditStep("sync")} className="w-full">
                    Next: Audience Sync &rarr;
                  </Button>
                </TabsContent>

                {/* Step 5: Audience Sync */}
                <TabsContent value="sync" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-syncUrl">Audience Sync API Endpoint</Label>
                    <Input
                      id="edit-syncUrl"
                      value={editData.syncUrl || ""}
                      onChange={(e) => setEditData({ ...editData, syncUrl: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-syncApiKey">Sync API Key (Encrypted)</Label>
                    <Input
                      id="edit-syncApiKey"
                      type="password"
                      placeholder="•••••••••••••••• (Leave blank to keep existing)"
                      value={editData.syncApiKey || ""}
                      onChange={(e) => setEditData({ ...editData, syncApiKey: e.target.value })}
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <Button type="submit" disabled={savingEdit} className="w-full bg-slate-900 hover:bg-slate-800 text-white">
                      {savingEdit ? "Saving Product Changes..." : "Save Product Changes"}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Onboarding Wizard Dialog ── */}
        <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Onboard New Product / Brand
              </DialogTitle>
              <DialogDescription>
                Register a new tenant (e.g. Gada, PalmTechnIQ). Every brand must provide its own Resend API key to isolate domain reputation.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleOnboardSubmit} className="space-y-6 pt-2">
              <Tabs value={formStep} onValueChange={(v: any) => setFormStep(v)} className="w-full">
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="basics" className="text-xs">1. Identity</TabsTrigger>
                  <TabsTrigger value="sender" className="text-xs">2. Resend Key</TabsTrigger>
                  <TabsTrigger value="branding" className="text-xs">3. Styling</TabsTrigger>
                  <TabsTrigger value="footer" className="text-xs">4. Legal</TabsTrigger>
                  <TabsTrigger value="sync" className="text-xs">5. Sync</TabsTrigger>
                </TabsList>

                {/* Step 1: Basics */}
                <TabsContent value="basics" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Gada, PalmTechnIQ"
                      value={newProduct.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewProduct({
                          ...newProduct,
                          name: val,
                          slug: val.toLowerCase().replace(/[^a-z0-9]/g, "-"),
                        });
                      }}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug * (used in URL and basis references)</Label>
                    <Input
                      id="slug"
                      placeholder="e.g. gada"
                      value={newProduct.slug}
                      onChange={(e) => setNewProduct({ ...newProduct, slug: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Short Description</Label>
                    <Input
                      id="description"
                      placeholder="Brief tagline or description"
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="new-planTier">Plan Tier</Label>
                      <Select
                        value={newProduct.planTier || "free"}
                        onValueChange={(val) => {
                          const quotaMap: Record<string, number> = {
                            free: 100,
                            starter: 500,
                            growth: 2500,
                            enterprise: 10000,
                          };
                          setNewProduct({
                            ...newProduct,
                            planTier: val,
                            dailyQuota: quotaMap[val] || newProduct.dailyQuota || 100,
                          });
                        }}
                      >
                        <SelectTrigger id="new-planTier" className="text-xs">
                          <SelectValue placeholder="Select plan tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free (100 emails/day)</SelectItem>
                          <SelectItem value="starter">Starter (500 emails/day)</SelectItem>
                          <SelectItem value="growth">Growth (2,500 emails/day)</SelectItem>
                          <SelectItem value="enterprise">Enterprise (10,000 emails/day)</SelectItem>
                          <SelectItem value="custom">Custom Quota</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-dailyQuota">Daily Dispatch Quota</Label>
                      <Input
                        id="new-dailyQuota"
                        type="number"
                        min="1"
                        max="1000000"
                        value={newProduct.dailyQuota || 100}
                        onChange={(e) => setNewProduct({ ...newProduct, dailyQuota: Number(e.target.value) })}
                        disabled={Boolean(newProduct.planTier && newProduct.planTier !== "custom")}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Emails dispatched in each daily batch.
                      </p>
                    </div>
                  </div>

                  <Button type="button" size="sm" onClick={() => setFormStep("sender")} className="w-full">
                    Next: Sender & API Key &rarr;
                  </Button>
                </TabsContent>

                {/* Step 2: Sender */}
                <TabsContent value="sender" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="senderName">Sender Name *</Label>
                    <Input
                      id="senderName"
                      placeholder="e.g. Gada Team"
                      value={newProduct.senderName}
                      onChange={(e) => setNewProduct({ ...newProduct, senderName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="senderEmail">Sender Email *</Label>
                      <Input
                        id="senderEmail"
                        type="email"
                        placeholder="hello@gada.app"
                        value={newProduct.senderEmail}
                        onChange={(e) => setNewProduct({ ...newProduct, senderEmail: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="replyToEmail">Reply-To Email</Label>
                      <Input
                        id="replyToEmail"
                        type="email"
                        placeholder="support@gada.app"
                        value={newProduct.replyToEmail}
                        onChange={(e) => setNewProduct({ ...newProduct, replyToEmail: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resendApiKey">Resend API Key * (AES-256 Encrypted)</Label>
                    <Input
                      id="resendApiKey"
                      type="password"
                      placeholder="re_..."
                      value={newProduct.resendApiKey}
                      onChange={(e) => setNewProduct({ ...newProduct, resendApiKey: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="webhookSecret">Resend Webhook Signing Secret (Optional)</Label>
                    <Input
                      id="webhookSecret"
                      type="password"
                      placeholder="whsec_..."
                      value={newProduct.webhookSecret}
                      onChange={(e) => setNewProduct({ ...newProduct, webhookSecret: e.target.value })}
                    />
                  </div>

                  <Button type="button" size="sm" onClick={() => setFormStep("branding")} className="w-full">
                    Next: Brand Styling &rarr;
                  </Button>
                </TabsContent>

                {/* Step 3: Branding */}
                <TabsContent value="branding" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo Image URL *</Label>
                    <Input
                      id="logoUrl"
                      placeholder="https://example.com/logo.png"
                      value={newProduct.logoUrl}
                      onChange={(e) => setNewProduct({ ...newProduct, logoUrl: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="websiteUrl">Website URL *</Label>
                    <Input
                      id="websiteUrl"
                      placeholder="https://gada.app"
                      value={newProduct.websiteUrl}
                      onChange={(e) => setNewProduct({ ...newProduct, websiteUrl: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="primaryColor"
                          value={newProduct.primaryColor}
                          onChange={(e) => setNewProduct({ ...newProduct, primaryColor: e.target.value })}
                          className="h-9 w-12 rounded cursor-pointer border"
                        />
                        <Input
                          value={newProduct.primaryColor}
                          onChange={(e) => setNewProduct({ ...newProduct, primaryColor: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accentColor">Accent Color (CTA Buttons)</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="accentColor"
                          value={newProduct.accentColor}
                          onChange={(e) => setNewProduct({ ...newProduct, accentColor: e.target.value })}
                          className="h-9 w-12 rounded cursor-pointer border"
                        />
                        <Input
                          value={newProduct.accentColor}
                          onChange={(e) => setNewProduct({ ...newProduct, accentColor: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="button" size="sm" onClick={() => setFormStep("footer")} className="w-full">
                    Next: Legal & Social &rarr;
                  </Button>
                </TabsContent>

                {/* Step 4: Legal & Social */}
                <TabsContent value="footer" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Physical Mailing Address</Label>
                    <Input
                      id="address"
                      placeholder="e.g. 1st Floor, Festac Tower, Lagos, Nigeria"
                      value={newProduct.address}
                      onChange={(e) => setNewProduct({ ...newProduct, address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="supportEmail">Support Email</Label>
                      <Input
                        id="supportEmail"
                        placeholder="support@gada.app"
                        value={newProduct.supportEmail}
                        onChange={(e) => setNewProduct({ ...newProduct, supportEmail: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unsubscribeEmail">Unsubscribe Email</Label>
                      <Input
                        id="unsubscribeEmail"
                        placeholder="unsubscribe@gada.app"
                        value={newProduct.unsubscribeEmail}
                        onChange={(e) => setNewProduct({ ...newProduct, unsubscribeEmail: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Social Channels</Label>
                    <Input
                      placeholder="LinkedIn URL"
                      value={newProduct.socialLinkedin}
                      onChange={(e) => setNewProduct({ ...newProduct, socialLinkedin: e.target.value })}
                      className="text-xs mb-2"
                    />
                    <Input
                      placeholder="Twitter / X URL"
                      value={newProduct.socialTwitter}
                      onChange={(e) => setNewProduct({ ...newProduct, socialTwitter: e.target.value })}
                      className="text-xs mb-2"
                    />
                    <Input
                      placeholder="Instagram URL"
                      value={newProduct.socialInstagram}
                      onChange={(e) => setNewProduct({ ...newProduct, socialInstagram: e.target.value })}
                      className="text-xs"
                    />
                  </div>

                  <Button type="button" size="sm" onClick={() => setFormStep("sync")} className="w-full">
                    Next: Audience Sync &rarr;
                  </Button>
                </TabsContent>

                {/* Step 5: Audience Sync */}
                <TabsContent value="sync" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="syncUrl">Audience Sync API Endpoint</Label>
                    <Input
                      id="syncUrl"
                      placeholder="https://api.gada.app/mailing/users"
                      value={newProduct.syncUrl}
                      onChange={(e) => setNewProduct({ ...newProduct, syncUrl: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="syncApiKey">Sync API Key (Encrypted)</Label>
                    <Input
                      id="syncApiKey"
                      type="password"
                      placeholder="key_..."
                      value={newProduct.syncApiKey}
                      onChange={(e) => setNewProduct({ ...newProduct, syncApiKey: e.target.value })}
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <Button type="submit" disabled={savingOnboard} className="w-full">
                      {savingOnboard ? "Onboarding Brand..." : "Complete Onboarding"}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Template Customizer & Live Preview Dialog ── */}
        <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileEdit className="h-5 w-5 text-primary" />
                  <span>Template Customizer: {selectedProductForTemplates?.name}</span>
                </div>
                <Link href="/admin/templates">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-slate-600">
                    Open Full Templates Hub <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </DialogTitle>
              <DialogDescription>
                Customize default subjects, preview texts, action buttons, and starter body for each of the 11 template types.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {/* Left Column: Template List */}
              <div className="space-y-1.5 border-r pr-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Select Template Type
                </p>
                {templates.map((tpl) => (
                  <button
                    key={tpl.id || tpl.type}
                    type="button"
                    onClick={() => {
                      setSelectedTemplate(tpl);
                      if (selectedProductForTemplates) {
                        loadLivePreview(selectedProductForTemplates.slug, tpl);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                      selectedTemplate?.type === tpl.type
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span>{tpl.name || tpl.type}</span>
                    <span className="font-mono text-[10px] opacity-75">{tpl.type}</span>
                  </button>
                ))}
              </div>

              {/* Middle Column: Edit Fields */}
              <div className="space-y-3">
                {selectedTemplate ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Display Name</Label>
                      <Input
                        value={selectedTemplate.name || ""}
                        onChange={(e) =>
                          setSelectedTemplate({ ...selectedTemplate, name: e.target.value })
                        }
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Default Subject</Label>
                      <Input
                        value={selectedTemplate.defaultSubject || ""}
                        onChange={(e) =>
                          setSelectedTemplate({ ...selectedTemplate, defaultSubject: e.target.value })
                        }
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Inbox Preview Text</Label>
                      <Input
                        value={selectedTemplate.previewText || ""}
                        onChange={(e) =>
                          setSelectedTemplate({ ...selectedTemplate, previewText: e.target.value })
                        }
                        className="text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Default CTA Label</Label>
                        <Input
                          value={selectedTemplate.defaultCtaLabel || ""}
                          onChange={(e) =>
                            setSelectedTemplate({ ...selectedTemplate, defaultCtaLabel: e.target.value })
                          }
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Default CTA URL</Label>
                        <Input
                          value={selectedTemplate.defaultCtaUrl || ""}
                          onChange={(e) =>
                            setSelectedTemplate({ ...selectedTemplate, defaultCtaUrl: e.target.value })
                          }
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Starter Email Body (HTML)</Label>
                      <Textarea
                        rows={4}
                        value={selectedTemplate.starterBody || ""}
                        onChange={(e) =>
                          setSelectedTemplate({ ...selectedTemplate, starterBody: e.target.value })
                        }
                        className="text-xs font-mono"
                      />
                    </div>

                    <Button
                      size="sm"
                      onClick={saveTemplateChanges}
                      disabled={savingTemplate}
                      className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      {savingTemplate ? "Saving Defaults..." : "Save Template Defaults"}
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Select a template to configure.</p>
                )}
              </div>

              {/* Right Column: Live Email Preview */}
              <div className="border rounded-lg bg-white p-2 overflow-hidden flex flex-col h-[430px]">
                <div className="flex items-center justify-between pb-2 border-b text-xs font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" /> Live Brand Preview
                  </span>
                  {previewLoading && <span className="text-[10px] text-primary animate-pulse">Rendering...</span>}
                </div>
                <div className="flex-1 overflow-auto pt-2 bg-slate-50 p-1 rounded">
                  {previewHtml ? (
                    <iframe
                      title="Preview"
                      srcDoc={previewHtml}
                      className="w-full h-full border-0 rounded bg-white"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                      No preview available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Email Layout Editor Dialog ── */}
        <Dialog open={layoutModalOpen} onOpenChange={setLayoutModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Email Layout: {layoutProduct?.name}
              </DialogTitle>
              <DialogDescription>
                Customise how the header, footer, and social icons render in every dynamic email for this brand.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {/* Left: Controls */}
              <div className="space-y-6">
                {/* Header Style */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Header Style</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["logo-banner", "logo-only"] as const).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => updateLayoutConfig({ headerStyle: val })}
                        className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                          (layoutConfig.headerStyle ?? "logo-banner") === val
                            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                            : "border-slate-200 hover:border-slate-400 text-slate-600"
                        }`}
                      >
                        <div className="text-base mb-1">{val === "logo-banner" ? "🎨" : "⬜"}</div>
                        {val === "logo-banner" ? "Coloured Banner" : "White / Minimal"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footer Style */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Footer Style</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["dark", "light"] as const).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => updateLayoutConfig({ footerStyle: val })}
                        className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                          (layoutConfig.footerStyle ?? "dark") === val
                            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                            : "border-slate-200 hover:border-slate-400 text-slate-600"
                        }`}
                      >
                        <div className="text-base mb-1">{val === "dark" ? "🌑" : "☀️"}</div>
                        {val === "dark" ? "Dark Brand Band" : "Light / Centred"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Social Layout */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Social Icon Alignment</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["left", "center"] as const).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => updateLayoutConfig({ socialLayout: val })}
                        className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                          (layoutConfig.socialLayout ?? "left") === val
                            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                            : "border-slate-200 hover:border-slate-400 text-slate-600"
                        }`}
                      >
                        <div className="text-base mb-1">{val === "left" ? "⬅️" : "↔️"}</div>
                        {val === "left" ? "Left Aligned" : "Centred"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon Size */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Social Icon Size</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([18, 23, 28] as const).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => updateLayoutConfig({ socialIconSize: val })}
                        className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                          (layoutConfig.socialIconSize ?? 18) === val
                            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                            : "border-slate-200 hover:border-slate-400 text-slate-600"
                        }`}
                      >
                        {val}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview template selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview Template</Label>
                  <select
                    className="w-full text-xs border rounded-md p-2 bg-white"
                    value={layoutPreviewType}
                    onChange={(e) => {
                      setLayoutPreviewType(e.target.value);
                      if (layoutProduct) loadLayoutPreview(layoutProduct.slug, layoutConfig, e.target.value);
                    }}
                  >
                    {["newsletter","welcome","announcement","cohort-welcome","promotion","event","holiday"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <Button onClick={saveLayout} disabled={savingLayout} className="w-full">
                  {savingLayout ? "Saving Layout..." : "Save Layout Config"}
                </Button>
              </div>

              {/* Right: Live Preview */}
              <div className="border rounded-lg bg-white p-2 flex flex-col" style={{ minHeight: 500 }}>
                <div className="flex items-center justify-between pb-2 border-b text-xs font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Live Preview</span>
                  {layoutPreviewLoading && <span className="text-[10px] text-primary animate-pulse">Rendering...</span>}
                </div>
                <div className="flex-1 overflow-auto pt-2">
                  {layoutPreviewHtml ? (
                    <iframe title="Layout Preview" srcDoc={layoutPreviewHtml} className="w-full h-full border-0 rounded" style={{ minHeight: 460 }} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading preview...</div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
