"use client";

import { useAuthContext } from "@/app/provider";
import { Button } from "@/components/ui/button";
import { db } from "@/configs/firebaseConfig";
import axios from "axios";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  Download,
  Loader2Icon,
  LoaderCircle,
  Play,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";

type PreviewProduct = {
  id: string;
  userEmail: string;
  description: string;
  size: string;
  status: string;
  finalProductImageUrl: string;
  productImageUrl: string;
  imageToVideoStatus: string;
  videoUrl: string;
};

const PreviewResult = () => {
  const { user } = useAuthContext();
  const [productList, setProductList] = useState<PreviewProduct[]>([]); // default empty array
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, "user-ads"),
      where("userEmail", "==", user.email)
    );

    const unSub = onSnapshot(q, (querySnapshot) => {
      const matchedDocs: any[] = [];
      querySnapshot.forEach((doc) => {
        matchedDocs.push({ id: doc.id, ...doc.data() });
      });
      setProductList(matchedDocs);
    });

    return () => unSub();
  }, [user?.email]);

  // Prevent server-side rendering mismatch
  if (!user) return null;

  const DownloadImage = async (imageUrl: string) => {
    const result = await fetch(imageUrl);
    const blob = await result.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;

    a.setAttribute("download", "kh-product");
    document.body.appendChild(a);

    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  };

  const GenerateVideo = async (config: any) => {
    setLoading(true);
    const result = await axios.post("/api/generate-product-video", {
      imageUrl: config?.finalProductImageUrl,
      imageToVideoPrompt: config?.imageToVideoPrompt,
      uid: user?.uid,
      docId: config?.id,
    });

    setLoading(false);

    console.log("result: ", result?.data);
  };

  return (
    <div className="p-5 rounded-2xl border">
      <h2 className="font-bold text-2xl mb-4">Generated Result</h2>

      <div className="grid grid-cols-2 gap-5 mt-4">
        {productList.map((product, index) => (
          <div key={index} className="border p-2 rounded-lg">
            {product?.status === "completed" ? (
              <div>
                <Image
                  key={product.id}
                  src={product.finalProductImageUrl}
                  alt={product.description || "Product"}
                  width={500}
                  height={500}
                  className="w-full h-[250px] rounded-lg"
                />

                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={"ghost"}
                      onClick={() =>
                        DownloadImage(product?.finalProductImageUrl)
                      }
                    >
                      <Download />
                    </Button>

                    <Link href={product?.finalProductImageUrl} target="_blank">
                      <Button variant={"ghost"}>View</Button>
                    </Link>

                    {product?.videoUrl && (
                      <Link href={product?.videoUrl} target="_blank">
                        <Button variant={"ghost"}>
                          <Play />
                        </Button>
                      </Link>
                    )}
                  </div>

                  {!product?.videoUrl && (
                    <Button
                      disabled={product?.imageToVideoStatus === "pending"}
                      onClick={() => GenerateVideo(product)}
                    >
                      {product?.imageToVideoStatus === "pending" ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Sparkles />
                      )}
                      Animate
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl h-full min-h-[250px]">
                <Loader2Icon className="animate-spin" />
                <h2>Generating...</h2>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PreviewResult;
