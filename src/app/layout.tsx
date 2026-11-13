import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Care4All | Your care companion",
  description: "A fictional cancer-care navigation demo by Tech4Good.",
  icons: { icon: "/care-192.png", apple: "/care-apple.png" },
};
export const viewport: Viewport = { themeColor: "#eff7f5" };
export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en"><body>{children}</body></html>;
}
