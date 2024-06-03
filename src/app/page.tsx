import Templatecard from "@/components/shared/template-card";
import { TEMPLATECARD } from "@/lib/const";
import React from "react";

export default function Home() {
  return (
    <div className="text-center max-w-7xl mx-auto pb-[30px] ">
      <h3 className="md:text-[130px] text-[40px] font-bold">ISCE-mail</h3>
      <p className="font-bold text-[13px] md:text-[15px] ">
        Select a template to use
      </p>
      <div className="grid gap-10 md:px-[60px] px-[10px] pt-[30px] lg:grid-cols-3 md:grid-cols-2 grid-cols-1 ">
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
