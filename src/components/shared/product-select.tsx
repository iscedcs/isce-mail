"use client";

import React, { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { PlusCircle } from "lucide-react";

export type ProductOption = {
  id: string;
  name: string;
  slug: string;
  primaryColor?: string;
  accentColor?: string;
  syncUrl?: string | null;
  websiteUrl?: string;
  logoUrl?: string;
};

const DEFAULT_FALLBACK_PRODUCTS: ProductOption[] = [
  { id: "isce", name: "ISCE Tech", slug: "isce", primaryColor: "#000000" },
  { id: "palmtechniq", name: "PalmTechnIQ", slug: "palmtechniq", primaryColor: "#021A1A" },
];

interface ProductSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  onProductSelect?: (product: ProductOption) => void;
  disabled?: boolean;
  className?: string;
}

export default function ProductSelect({
  value,
  onValueChange,
  onProductSelect,
  disabled = false,
  className = "w-full",
}: ProductSelectProps) {
  const [products, setProducts] = useState<ProductOption[]>(DEFAULT_FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadProducts() {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.products && Array.isArray(data.products) && data.products.length > 0) {
            setProducts(data.products);
            // If current value isn't in products list, keep it or match
            const found = data.products.find(
              (p: ProductOption) => p.slug.toLowerCase() === value.toLowerCase(),
            );
            if (found && onProductSelect) {
              onProductSelect(found);
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch dynamic products, using default options", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadProducts();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (slug: string) => {
    onValueChange(slug);
    const chosen = products.find((p) => p.slug.toLowerCase() === slug.toLowerCase());
    if (chosen && onProductSelect) {
      onProductSelect(chosen);
    }
  };

  // Normalise value for matching
  const normalisedValue =
    products.find((p) => p.slug.toLowerCase() === (value || "").toLowerCase())?.slug ||
    value ||
    "isce";

  return (
    <div className="space-y-1.5">
      <Select value={normalisedValue} onValueChange={handleChange} disabled={disabled || loading}>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Select Brand / Product">
            {(() => {
              const current = products.find(
                (p) => p.slug.toLowerCase() === normalisedValue.toLowerCase(),
              );
              if (!current) return normalisedValue || "Select Product";
              return (
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: current.primaryColor || "#000" }}
                  />
                  <span>{current.name}</span>
                </span>
              );
            })()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {products.map((prod) => (
            <SelectItem key={prod.id || prod.slug} value={prod.slug}>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-black/10 shadow-sm"
                  style={{ backgroundColor: prod.primaryColor || "#000" }}
                />
                <span className="font-medium">{prod.name}</span>
                <span className="text-xs text-muted-foreground">({prod.slug})</span>
              </div>
            </SelectItem>
          ))}
          <div className="border-t pt-1 mt-1 px-1">
            <Link
              href="/admin/products"
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-primary hover:underline hover:bg-muted rounded transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Onboard New Brand (Admins)</span>
            </Link>
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
