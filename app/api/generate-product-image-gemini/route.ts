// app/api/generate-product-image-gemini/route.ts
import { db } from "@/configs/firebaseConfig";
import { imagekit } from "@/lib/imagekit";
import { GeminiAi } from "@/lib/geminiai"; // Your Gemini client
import { collection, doc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

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
                  if (error.status === 503 && i < retries - 1) {
                        console.warn(`Gemini model overloaded. Retrying ${i + 1}/${retries}...`);
                        await new Promise((r) => setTimeout(r, delay));
                  } else {
                        throw error;
                  }
            }
      }
}

export async function POST(req: NextRequest) {
      try {
            const formData = await req.formData();
            const file = formData.get("file") as File;
            const description = formData.get("description");
            const size = formData.get("size");
            const userEmail = formData?.get('userEmail');

            // update credit
            const userRef = collection(db, 'users');
            const q = query(userRef, where('userEmail', '==', userEmail));
            const querySnapshot = await getDocs(q);
            const userDoc = querySnapshot.docs[0];
            const userInfo = userDoc.data();


            // Save to Database
            const docId = Date.now().toString();
            await setDoc(doc(db, 'user-ads', docId), {
                  userEmail: userEmail,
                  status: 'pending',
                  description: description,
                  size: size,
            });

            // --- 1️⃣ Upload original product image to ImageKit ---
            const arrayBuffer = await file.arrayBuffer();
            const base64File = Buffer.from(arrayBuffer).toString("base64");

            const imageKitRef = await imagekit.upload({
                  file: base64File,
                  fileName: `${Date.now()}.png`,
                  isPublished: true,
            });

            console.log("🖼 Uploaded Product Image:", imageKitRef.url);


            // Update Doc
            await updateDoc(doc(db, 'user-ads', docId), {
                  finalProductImageUrl: imageKitRef?.url,
                  productImageUrl: imageKitRef.url,
                  status: 'completed',
                  userInfo: userInfo?.credits - 5,
            })


            return NextResponse.json(imageKitRef.url);


            /* 
            // --- 2️⃣ Generate prompt JSON using Gemini ---
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

            // --- 4️⃣ Generate final image using Gemini image model ---
            const imageContents = [
                  { role: "user", parts: [{ text: json.textToImage }] },
                  { role: "user", parts: [{ inlineData: { mimeType: "image/png", data: base64File } }] },
            ];
            const imageResponse = await generateWithRetry("gemini-2.5-flash-image-preview", imageContents);
            const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        
            if (!imagePart || !imagePart.inlineData.data) {
              throw new Error("Gemini did not return image data");
            }
        
            const generatedBase64 = imagePart.inlineData.data;
        
            // --- 5️⃣ Upload generated image to ImageKit ---
            const uploadResult = await imagekit.upload({
              file: `data:image/png;base64,${generatedBase64}`,
              fileName: `generated-${Date.now()}.png`,
              isPublished: true,
            });
        
            // --- 6️⃣ Save to Firestore ---
            await setDoc(doc(db, "user-ads", Date.now().toString()), {
              userEmail: "",
              finalProductImageUrl: uploadResult.url,
              productImageUrl: imageKitRef.url,
              description,
              size,
              promptJSON: json,
            }); 
            
            return NextResponse.json({
              status: "success",
              finalImage: uploadResult.url,
              productImage: imageKitRef.url,
              promptJSON: json,
            });
            */

      } catch (error: any) {
            console.error("❌ Error:", error);
            return NextResponse.json(
                  { status: "error", message: error.message || "Internal Server Error" },
                  { status: 500 }
            );
      }
}





/* const textOutput = promptResponse.text.trim();
    console.log("🧠 Prompt JSON:", textOutput);
    const json = JSON.parse(textOutput);

    // 3️⃣ Generate image using Gemini’s image-capable model
    const imageResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: [
        { role: "user", parts: [{ text: json.textToImage }] },
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                data: base64File,
              },
            },
          ],
        },
      ],
    });

    // 4️⃣ Extract base64 image from response
    const imagePart =
      imageResponse.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inlineData
      );
    if (!imagePart) throw new Error("Gemini did not return image data.");

    const generatedBase64 = imagePart.inlineData.data;

    // 5️⃣ Upload generated image to ImageKit
    const uploadResult = await imagekit.upload({
      file: `data:image/png;base64,${generatedBase64}`,
      fileName: `generated-${Date.now()}.png`,
      isPublished: true,
    });

    // 6️⃣ Save everything to Firestore
    await setDoc(doc(db, "user-ads", Date.now().toString()), {
      userEmail: "",
      finalProductImageUrl: uploadResult.url,
      productImageUrl: imageKitRef.url,
      description,
      size,
    });

    return NextResponse.json({
      status: "success",
      generated: uploadResult.url,
    }); 
    
*/