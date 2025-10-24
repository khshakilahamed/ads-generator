"use client";

import React, { useEffect, useState } from "react";
import FormInput from "../_components/FormInput";
import PreviewResult from "../_components/PreviewResult";
import axios from "axios";
import { useAuthContext } from "@/app/provider";
import { useRouter } from "next/navigation";

type FormData = {
  file: File | undefined;
  description: string;
  size: string;
  imageUrl?: string;
  avatar?: string;
};

const ProductImages = ({
  title,
  enableAvatar = false,
}: {
  title?: string;
  enableAvatar?: boolean;
}) => {
  const [formData, setFormData] = useState<FormData>();
  const [loading, setLoading] = useState<boolean>(false);
  const { user } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user]);

  const onHandleInputChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const OnGenerate = async () => {
    setLoading(true);
    if (!formData?.file || formData?.imageUrl) {
      alert("Please upload product image");
      return;
    }
    /* if (formData?.description || formData?.size) {
      alert("Enter all fields");
      return;
    } */

    const formData_ = new FormData();
    formData_.append("file", formData.file);
    formData_.append("description", formData.description ?? "");
    formData_.append("size", formData.size ?? "1024x1024");
    formData_.append("userEmail", user?.email ?? "");

    if (formData?.avatar) {
      formData_.append("avatar", formData?.avatar);
    }

    // Make API Call
    // const result = await axios.post("/api/generate-product-image", formData_);
    const result = await axios.post(
      "/api/generate-product-image-gemini",
      formData_
    );

    console.log(result.data);

    // Final result
    setLoading(false);
  };

  return (
    <div>
      <h2 className="font-bold text-2xl mb-3">
        {title ?? "AI Product Image Generator"}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        <div>
          <FormInput
            onHandleInputChange={(filed: string, value: string) =>
              onHandleInputChange(filed, value)
            }
            OnGenerate={OnGenerate}
            loading={loading}
            enableAvatar={enableAvatar}
          />
        </div>
        <div className="md:col-span-2">
          <PreviewResult />
        </div>
      </div>
    </div>
  );
};

export default ProductImages;
