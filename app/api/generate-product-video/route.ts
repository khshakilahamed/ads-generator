import { db } from "@/configs/firebaseConfig";
import { imagekit } from "@/lib/imagekit";
import { replicateAi } from "@/lib/replicate-ai";
import { doc, updateDoc } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
      const { imageUrl, imageToVideoPrompt, uid, docId } = await req.json();

      const input = {
            image: imageUrl,
            prompt: imageToVideoPrompt
      };

      await updateDoc(doc(db, 'user-ads', docId), {
            imageToVideoStatus: 'pending',
      });

      const output = await replicateAi.run("wan-video/wan-2.2-i2v-fast", { input });

      // To access the file URL:
      // @ts-ignore
      console.log(output.url());
      //=> "https://replicate.delivery/.../output.mp4"

      // Save to ImageKit
      // @ts-ignore
      const response = await fetch(output.url());
      const videoBuffer = Buffer.from(await response.arrayBuffer());
      const uploadResult = await imagekit.upload({
            file: videoBuffer,
            fileName: `video_${Date.now()}.mp4`,
            isPublished: true,
      })


      await updateDoc(doc(db, 'user-ads', docId), {
            imageToVideoStatus: 'completed',
            videoUrl: uploadResult.url,
      });


      // TODO: update use credit

      // @ts-ignore
      return NextResponse.json(uploadResult.url)
}