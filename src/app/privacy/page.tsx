import type { Metadata } from "next";
import { Privacy } from "@/components/privacy";

export const metadata: Metadata = { title: "How your data is handled" };
export default function Page() { return <Privacy />; }
