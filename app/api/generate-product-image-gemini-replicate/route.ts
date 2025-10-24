// app/api/generate-product-image/route.ts
import { db } from "@/configs/firebaseConfig";
import { imagekit } from "@/lib/imagekit";
import { GeminiAi } from "@/lib/geminiai"; // Gemini free tier for prompt JSON
import Replicate from "replicate";
import { doc, setDoc } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY!,
});

const PROMPT = `
Create a vibrant product showcase image featuring an uploaded image in the center,
surrounded by dynamic splashes of liquid or relevant materials that complement the product.
Use a clean, colorful background to make the product stand out.
Include subtle elements related to the product’s flavor, ingredients, or theme
floating around to add context and visual interest.
Ensure the product is sharp and in focus, conveying motion and energy.

Then, provide me a JSON object with two fields:
{
  "textToImage": "A refined text prompt to generate the image.",
  "imageToVideo": "A detailed text prompt to create a short video animation from that image."
}

⚠️ Output only valid JSON, no explanations, no markdown, no extra text.
`;

// --- Retry helper for Gemini overload errors ---
async function generateWithRetry(
  model: string,
  contents: any,
  retries = 3,
  delay = 1500
) {
  for (let i = 0; i < retries; i++) {
    try {
      return await GeminiAi.models.generateContent({ model, contents });
    } catch (error: any) {
      if ((error.status === 503 || error.status === 429) && i < retries - 1) {
        console.warn(
          `Gemini model busy or quota exceeded. Retrying ${i + 1}/${retries}...`
        );
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
}

// --- Generate edited image using Replicate Inpainting ---
async function editImageWithReplicate(prompt: string, imageUrl: string, maskUrl?: string) {
  try {
    const output: any = await replicate.run(
      "stability-ai/stable-diffusion-inpainting",
      {
        input: {
          prompt,
          image: imageUrl, // existing uploaded image
          mask: maskUrl || null, // optional mask
        },
      }
    );
    return output[0]; // URL of edited image
  } catch (err) {
    console.error("Replicate image editing failed:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const description = formData.get("description");
    const size = formData.get("size");

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // --- 1️⃣ Upload original product image to ImageKit ---
    const arrayBuffer = await file.arrayBuffer();
    const base64File = Buffer.from(arrayBuffer).toString("base64");

    const imageKitRef = await imagekit.upload({
      file: base64File,
      fileName: `${Date.now()}.png`,
      isPublished: true,
    });

    console.log("🖼 Uploaded Product Image:", imageKitRef.url);

    // --- 2️⃣ Generate prompt JSON using Gemini free tier ---
    const promptContents = [
      { role: "user", parts: [{ text: PROMPT }] },
      { role: "user", parts: [{ inlineData: { mimeType: "image/png", data: base64File } }] },
    ];

    const promptResponse = await generateWithRetry("gemini-2.0-flash", promptContents);

    const textOutput = promptResponse?.text ?? "";
    console.log("Raw Gemini Output:", textOutput);

    // --- 3️⃣ Extract JSON safely ---
    const match = textOutput.match(/\{[\s\S]*\}/);
    const json = match ? JSON.parse(match[0]) : null;

    if (!json) {
      throw new Error("Failed to parse JSON from Gemini output");
    }

    console.log("Parsed JSON:", json);

    // --- 4️⃣ Edit image using Replicate Inpainting ---
    const editedImageUrl = await editImageWithReplicate(json.textToImage, imageKitRef.url);

    console.log("Edited Image URL:", editedImageUrl);

    // --- 5️⃣ Save to Firestore ---
    await setDoc(doc(db, "user-ads", Date.now().toString()), {
      userEmail: "",
      finalProductImageUrl: editedImageUrl,
      productImageUrl: imageKitRef.url,
      description,
      size,
      promptJSON: json,
    });

    return NextResponse.json({
      status: "success",
      productImage: imageKitRef.url,
      finalEditedImage: editedImageUrl,
      promptJSON: json,
    });
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
