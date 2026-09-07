import Templatecard from "@/components/shared/template-card";
import { TEMPLATECARD } from "@/lib/const";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import React from "react";

export default function Home() {
  return (
    <div className="text-center max-w-7xl mx-auto pb-[30px] pt-6">
      <div className="flex justify-center gap-3 mb-6">
        <Link
          href="/history"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 shadow-sm transition-all"
        >
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          Campaign Dashboard & Insights
        </Link>
      </div>

      <h3 className="md:text-[110px] text-[40px] font-bold tracking-tight">ISCE-mail</h3>
      <p className="font-medium text-[14px] md:text-[16px] text-gray-500">
        Select an email template to dispatch, or use the scheduler for automated delivery
      </p>

      <div className="grid gap-10 md:px-[60px] px-[10px] pt-[30px] lg:grid-cols-3 md:grid-cols-2 grid-cols-1">
        {TEMPLATECARD.map((value, k) => (
          <Templatecard
            label={value.label}
            image={value.image}
            link={value.link}
            desc={value.desc}
            key={k}
          />
        ))}
      </div>
    </div>
  );
}
