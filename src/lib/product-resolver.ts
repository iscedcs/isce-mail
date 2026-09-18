/**
 * product-resolver.ts
 *
 * Resolves Product records from the database with a 5-minute in-memory TTL cache.
 * Provides decrypted Resend instances and sender addresses per product.
 *
 * Cache invalidation:
 *   - Call invalidateProductCache(slug) after any product update/delete.
 *   - The scheduler and email engine both use resolveProduct() so they always
 *     pick up new products / API key changes within one TTL window.
 */

import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { Resend } from "resend";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmailLayout = {
  headerStyle?: "logo-banner" | "logo-only";  // logo-banner = colored bg; logo-only = white bg
  footerStyle?: "dark" | "light";             // dark = primaryColor band; light = white centered
  socialLayout?: "left" | "center";           // alignment of social icon row
  socialIconSize?: 18 | 23 | 28;             // px size of each social icon
};

export type ResolvedProduct = {
  id: string;
  name: string;
  slug: string;
  senderName: string;
  senderEmail: string;
  replyToEmail: string | null;
  /** Decrypted Resend API key — never expose this to client-side code. */
  resendApiKey: string;
  /** Decrypted webhook secret (may be null). */
  webhookSecret: string | null;
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
  /** Decrypted sync API key (may be null). */
  syncApiKey: string | null;
  /** Per-product email shell layout configuration. */
  emailLayout: EmailLayout | null;
  planTier: string;
  dailyQuota: number;
  isActive: boolean;
};

export const PLAN_TIER_QUOTAS: Record<string, number> = {
  free: 100,
  starter: 500,
  growth: 2500,
  enterprise: 10000,
};

// ---------------------------------------------------------------------------
// Product cache — keyed by slug
// ---------------------------------------------------------------------------

type CacheEntry = {
  product: ResolvedProduct;
  expiresAt: number;
};

const CACHE_TTL_MS = 15 * 1000; // 15 seconds (keeps product tiers fresh while debouncing burst calls)

const productCache = new Map<string, CacheEntry>();

/** Evict a product from cache (e.g. after admin update). */
export function invalidateProductCache(slug: string): void {
  productCache.delete(slug);
  // Also clear any Resend client cached under this product's key
  // (resolved lazily on next resolveProduct call)
  resendClientCache.forEach((_, key) => {
    // We can't know the old API key here, so clear all on slug-keyed invalidation
    // is handled by the product cache miss on next call.
  });
}

/** Evict all cached products (e.g. on server restart hook). */
export function invalidateAllProductCache(): void {
  productCache.clear();
  resendClientCache.clear();
}

// ---------------------------------------------------------------------------
// Resend client cache — keyed by a hash of the decrypted API key
// ---------------------------------------------------------------------------

const resendClientCache = new Map<string, Resend>();

function getResendClient(decryptedApiKey: string): Resend {
  // Use first 8 chars of key as cache key (enough to distinguish; never log full key)
  const cacheKey = decryptedApiKey.slice(0, 8);
  if (!resendClientCache.has(cacheKey)) {
    resendClientCache.set(cacheKey, new Resend(decryptedApiKey));
  }
  return resendClientCache.get(cacheKey)!;
}

// ---------------------------------------------------------------------------
// Legacy fallback — resolves ISCE / PalmTechniq from .env for backwards compat
// during transition before those products are seeded into the database.
// ---------------------------------------------------------------------------

const LEGACY_ENV_KEYS: Record<string, string | undefined> = {
  isce: process.env.ISCE_RESEND_API_KEY,
  palmtechniq: process.env.PALMTECHNIQ_RESEND_API_KEY,
};

const LEGACY_SENDERS: Record<string, { name: string; email: string }> = {
  isce: { name: "ISCE Team", email: "hello@isce.tech" },
  palmtechniq: { name: "PalmTechnIQ", email: "support@palmtechniq.com" },
};

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a product by slug (or legacy basis string like "ISCE" / "PalmTechniq").
 * Returns a fully resolved product with decrypted secrets.
 *
 * Resolution order:
 *   1. In-memory cache (5m TTL)
 *   2. Prisma database lookup
 *   3. Legacy .env fallback for "isce" and "palmtechniq"
 *
 * Throws if no product is found through any path.
 */
export async function resolveProduct(slugOrBasis: string): Promise<ResolvedProduct> {
  const slug = slugOrBasis.toLowerCase();

  // 1. Cache hit
  const cached = productCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.product;
  }

  // 2. Database lookup
  let dbProduct: any = null;
  try {
    dbProduct = await prisma.product.findFirst({
      where: {
        OR: [{ slug }, { slug: slugOrBasis }],
        isActive: true,
      },
    });
  } catch (err) {
    console.warn("[product-resolver] DB lookup failed, trying legacy fallback:", err);
  }

  if (dbProduct) {
    const resolved: ResolvedProduct = {
      id: dbProduct.id,
      name: dbProduct.name,
      slug: dbProduct.slug,
      senderName: dbProduct.senderName,
      senderEmail: dbProduct.senderEmail,
      replyToEmail: dbProduct.replyToEmail,
      resendApiKey: decrypt(dbProduct.resendApiKey),
      webhookSecret: dbProduct.webhookSecret ? decrypt(dbProduct.webhookSecret) : null,
      logoUrl: dbProduct.logoUrl,
      websiteUrl: dbProduct.websiteUrl,
      primaryColor: dbProduct.primaryColor,
      accentColor: dbProduct.accentColor,
      buttonTextColor: dbProduct.buttonTextColor,
      buttonRadius: dbProduct.buttonRadius,
      supportEmail: dbProduct.supportEmail,
      unsubscribeEmail: dbProduct.unsubscribeEmail,
      address: dbProduct.address,
      socialLinks: dbProduct.socialLinks as Record<string, string> | null,
      syncUrl: dbProduct.syncUrl,
      syncApiKey: dbProduct.syncApiKey ? decrypt(dbProduct.syncApiKey) : null,
      emailLayout: (dbProduct.emailLayout as EmailLayout) ?? null,
      planTier: (dbProduct as any).planTier ?? "growth",
      dailyQuota: (dbProduct as any).dailyQuota ?? 2500,
      isActive: dbProduct.isActive,
    };

    productCache.set(slug, { product: resolved, expiresAt: Date.now() + CACHE_TTL_MS });
    return resolved;
  }

  // 3. Legacy .env fallback
  const legacyKey = LEGACY_ENV_KEYS[slug];
  const legacySender = LEGACY_SENDERS[slug];
  if (legacyKey && legacySender) {
    console.warn(
      `[product-resolver] Product "${slug}" not in DB — using legacy .env key. Run the seed script to migrate.`,
    );
    const resolved: ResolvedProduct = {
      id: slug,
      name: slug === "isce" ? "ISCE Tech" : "PalmTechnIQ",
      slug,
      senderName: legacySender.name,
      senderEmail: legacySender.email,
      replyToEmail: null,
      resendApiKey: legacyKey,
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET ?? null,
      logoUrl:
        slug === "isce"
          ? "https://www.isce.tech/images/fi-white.webp"
          : "https://www.palmtechniq.com/assets/palmtechniqlogo.png",
      websiteUrl:
        slug === "isce" ? "https://www.isce.tech" : "https://www.palmtechniq.com",
      primaryColor: slug === "isce" ? "#000000" : "#021A1A",
      accentColor: slug === "isce" ? "#000000" : "#16a34a",
      buttonTextColor: "#ffffff",
      buttonRadius: "full",
      supportEmail: null,
      unsubscribeEmail:
        slug === "isce" ? "unsubscribe@isce.tech" : "unsubscribe@palmtechniq.com",
      address:
        slug === "palmtechniq"
          ? "1st Floor, (Festac Tower) Chicken Republic Building, 22Rd, Festac Town, Lagos, Nigeria."
          : null,
      socialLinks:
        slug === "isce"
          ? {
              linkedin: "https://www.linkedin.com/company/isceapp/",
              instagram: "https://www.instagram.com/isce.tech?igsh=MXYzc3U2b3EyendzaA==",
              twitter: "https://x.com/isceapp?t=P4zRw8-h8c0-2H8eGMKJaA&s=09",
            }
          : {
              facebook: "https://www.facebook.com/profile.php?id=61561459226438&mibextid=ZbWKwL",
              linkedin: "https://www.linkedin.com/company/palmtechniq/",
              instagram: "https://www.instagram.com/palmtechniq/",
              slack: "https://app.slack.com/client/T076LDT7109/C0764SE3VB7",
            },
      syncUrl: slug === "palmtechniq" ? (process.env.PALMTECHNIQ_SYNC_BASE_URL ?? null) : null,
      syncApiKey: slug === "palmtechniq" ? (process.env.PALMTECHNIQ_SYNC_API_KEY ?? null) : null,
      // Legacy fallback: PalmTechnIQ uses light footer + centered socials to match old static templates
      emailLayout:
        slug === "palmtechniq"
          ? { headerStyle: "logo-banner", footerStyle: "light", socialLayout: "center", socialIconSize: 23 }
          : null,
      planTier: "growth",
      dailyQuota: 2500,
      isActive: true,
    };

    // Short cache for legacy fallback (1 min) so it's not hammered
    productCache.set(slug, { product: resolved, expiresAt: Date.now() + 60_000 });
    return resolved;
  }

  throw new Error(
    `Product not found: "${slugOrBasis}". Onboard it at /admin/products or check the slug is correct.`,
  );
}

/**
 * Get a ready-to-use Resend client for the given product.
 */
export function getResendForProduct(product: ResolvedProduct): Resend {
  return getResendClient(product.resendApiKey);
}

/**
 * Get the "From" header string for the given product.
 */
export function getSenderForProduct(product: ResolvedProduct): string {
  return `${product.senderName} <${product.senderEmail}>`;
}

/**
 * List all active products from DB (no secrets in response — for API/UI use).
 */
export async function listActiveProducts() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      senderName: true,
      senderEmail: true,
      replyToEmail: true,
      logoUrl: true,
      websiteUrl: true,
      primaryColor: true,
      accentColor: true,
      buttonTextColor: true,
      buttonRadius: true,
      supportEmail: true,
      unsubscribeEmail: true,
      address: true,
      socialLinks: true,
      syncUrl: true,
      planTier: true,
      dailyQuota: true,
      isActive: true,
      createdAt: true,
      // Intentionally excluded: resendApiKey, webhookSecret, syncApiKey
      _count: {
        select: { campaigns: true, templates: true },
      },
    },
  });
  return products;
}
