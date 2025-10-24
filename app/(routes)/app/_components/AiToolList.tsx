import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const AiTools = [
  {
    name: "AI Products Image",
    desc: "Generate high-quality, professional product images instantly with AI",
    bannerImage: "/product-image.png",
    path: "/creative-ai-tools/product-images",
  },
  {
    name: "AI Products Video",
    desc: "Create engaging product showcase videos using AI",
    bannerImage: "/product-video.png",
    path: "/creative-ai-tools/product-video",
  },
  {
    name: "AI Products With Avatar",
    desc: "Bring your products to life with AI avatars.",
    bannerImage: "/product-avatar.png",
    path: "/",
  },
];

const AiToolList = () => {
  return (
    <div>
      <h2 className="font-bold text-2xl mb-2">Creative AI Tools</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {AiTools?.map((tool, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-7 bg-zinc-800 rounded-2xl text-white"
          >
            <div>
              <h2 className="font-bold text-2xl">{tool?.name}</h2>
              <p className="opacity-60 mt-2">{tool?.desc}</p>
              <Link href={tool?.path}>
                <Button className="mt-4">Create Now</Button>
              </Link>
            </div>
            <Image
              src={tool?.bannerImage}
              alt={tool?.name}
              width={300}
              height={300}
              className="w-[200px]"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AiToolList;
