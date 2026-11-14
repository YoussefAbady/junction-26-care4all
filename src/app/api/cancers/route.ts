import { contentStore } from "@/lib/content";
import { cancersResponse } from "@/lib/content/responses";

export function GET(request: Request) {
  return cancersResponse(request, contentStore());
}
