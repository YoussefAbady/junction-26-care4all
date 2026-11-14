import type { Metadata, Viewport } from "next";
import { SkipLink } from "@/components/chrome";
import { PrefsProvider } from "@/components/prefs";
import "./globals.css";
import "./screening.css";

export const metadata: Metadata = {
  title: { default: "Care4ll by AstraZeneca", template: "%s · Care4ll" },
  description: "A friendly health questionnaire that adapts to you, in English and Finnish. Prototype.",
  icons: { icon: "/care-192.png", apple: "/care-apple.png" },
};
export const viewport: Viewport = { themeColor: "#830051", width: "device-width", initialScale: 1 };

// Applies the saved text size and language before the first paint, so there is no flash of small text.
const earlyPrefs = `try{var d=document.documentElement,s=localStorage.getItem("care4ll-text"),l=localStorage.getItem("care4ll-language");if(s==="lg"||s==="xl")d.dataset.text=s;if(l==="fi"||l==="en")d.lang=l}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: earlyPrefs }} /></head>
      <body>
        <PrefsProvider>
          <SkipLink />
          {children}
        </PrefsProvider>
      </body>
    </html>
  );
}
