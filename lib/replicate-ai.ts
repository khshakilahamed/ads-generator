import Replicate from "replicate";

export const replicateAi = new Replicate({
  auth: process.env.REPLICATE_API_KEY!,
});