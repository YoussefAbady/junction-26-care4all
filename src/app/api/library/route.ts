import { contentStore } from "@/lib/content";
import { libraryResponse } from "@/lib/content/responses";

export function GET(request: Request) {
  return libraryResponse(request, contentStore());
}
