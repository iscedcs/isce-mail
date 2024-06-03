import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";

export default function Templatecard({
  label,
  link,
  desc,
  image,
}: ITEMPLATECARD) {
  return (
    <div>
      <Card className="flex flex-col items-center">
        <CardHeader>
          <Image
            className="rounded-lg"
            width="500"
            height="400"
            src={image}
            alt="description"
          />
          <h1 className="font-bold mt-[20px]" >{label}</h1>
        </CardHeader>
        <CardContent>{desc}</CardContent>
        <CardFooter>
          <Button className="bg-black" asChild >
            <Link  href={link}>Use Template</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
