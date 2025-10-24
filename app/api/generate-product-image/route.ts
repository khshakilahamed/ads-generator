import { db } from "@/configs/firebaseConfig";
import { imagekit } from "@/lib/imagekit";
import { clientOpenAi } from "@/lib/openai";
import { collection, doc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

const PROMPT = `Create a vibrant product showcase image featuring a upload image in the center, surrounded by dynamic splashes of liquid or relevant material that complement the product. Use a clean, colorful background to make the product stand out. Include  subtle element related to product's flavour ingredient, or theme floating around to add context and visual interest. 
Ensure the product is sharp and in focus, with motion and energy conveyed through the splash effect.
Also give me image to video prompt for same in JSON format: {textToImage: ",imageToVideo:"}`;

const AvatarPrompt = `
      Create a vibrant product shhwcase image featuring the uploaded product image being held naturally
      by the uploaded avatar image. Position the product clearly in the avatar's hands, making it the focal
      point of the scene. Surround the product with dynamic splashes of liquid or relevant materials that
      complement the product. Use a clean, colorful background to make the product stand out. Add
      subtle floating elements related to the product's flavor, ingredients, or theme for extra context and
      visual interest. Ensure both the avatar and product are sharp, well-lit, and in focus, while motion and
      energy are conveyed through the splash effects.Also give me image to video prompt for same in
      JSON format: (textTolmage:",image ToVideo:"]
`;

export async function POST(req: NextRequest) {
      const formData = await req.formData();

      const file = formData.get('file') as File;
      const description = formData?.get('description');
      const size = formData?.get('size');
      const userEmail = formData?.get('userEmail');
      const avatar = formData?.get('avatar');

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

      // Upload Product Image
      const arrayBuffer = await file.arrayBuffer();
      const base64File = Buffer.from(arrayBuffer).toString('base64');

      const imageKitRef = await imagekit.upload({
            file: base64File,
            fileName: Date.now() + '.png',
            isPublished: true,
      });


      console.log("imageKitRef: ", imageKitRef.url);

      // Generate Product Prompt using ChatGpt
      const response = await clientOpenAi.responses.create({
            model: "gpt-4.1-mini",
            // input: "Write a one-sentence bedtime story about a unicorn."
            input: [
                  {
                        role: 'user',
                        content: [
                              {
                                    type: 'input_text',
                                    text: avatar ? AvatarPrompt : PROMPT
                              },
                              {
                                    type: 'input_image',
                                    image_url: imageKitRef.url,
                                    detail: 'auto'
                              }
                        ]
                  }
            ]
      });

      // console.log();
      const textOutput = response.output_text?.trim();
      let json = JSON.parse(textOutput);


      const avatarInput = avatar
            ? [
                  {
                        type: "input_image" as const,
                        image_url: String(avatar), // ✅ make sure it's a string
                        detail: "auto" as const,
                  },
            ]
            : [];

      // Generate Image Product
      const ImageResponse = await clientOpenAi.responses.create({
            model: "gpt-4.1-mini",
            max_output_tokens: 500,
            input: [
                  {
                        role: "user",
                        content: [
                              {
                                    type: "input_text",
                                    text: json?.textToImage || "Generate an image based on this description",
                              },
                              {
                                    type: "input_image",
                                    image_url: imageKitRef.url,
                                    detail: 'auto' as const,
                              },
                              ...avatarInput
                        ],
                  },
            ],
            tools: [{ type: "image_generation" }],
      });

      console.log("ImageResponse: ", ImageResponse);

      const imageData = ImageResponse.output?.filter((item: any) => item.type === 'image_generation_call').map((item: any) => item.result);

      const generatedImage = imageData[0]; // base64 Image

      // Upload generate image to imageKit
      const uploadResult = await imagekit.upload({
            file: `data:image/png;base64, ${generatedImage}`,
            fileName: `generate-${Date.now()}.png`,
            isPublished: true,
      });

      // Update Doc
      await updateDoc(doc(db, 'user-ads', docId), {
            finalProductImageUrl: imageKitRef?.url,
            productImageUrl: imageKitRef.url,
            status: 'completed',
            userInfo: userInfo?.credits - 5,
      })


      return NextResponse.json(uploadResult.url);
}