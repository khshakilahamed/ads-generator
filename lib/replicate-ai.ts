import Replicate from "replicate";
import { doc, setDoc } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY!,
});