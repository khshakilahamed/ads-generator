import { imagekit } from "@/lib/imagekit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
      const formData = await req.formData();

      const file = formData.get('file') as File;
      const description = formData?.get('description');
      const size = formData?.get('size');

      // Upload Product Image
      const arrayBuffer = await file.arrayBuffer();
      const base64File = Buffer.from(arrayBuffer).toString('base64');

      const imageKitRef = await imagekit.upload({
            file: base64File,
            fileName: Date.now() + '.png',
            isPublished: true,
      });


      console.log("imageKitRef: ", imageKitRef.url);

      return NextResponse.json(imageKitRef.url);
}