import { contentStore } from "@/lib/content";
import { contentResponse } from "@/lib/content/responses";

export function GET(request: Request) {
  return contentResponse(request, contentStore());
}
