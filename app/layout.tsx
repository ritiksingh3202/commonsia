import type { Metadata } from "next";
import { ABeeZee, Poppins } from "next/font/google";
import { AuthSessionProvider } from "@/components/providers/AuthSessionProvider";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const abeeZee = ABeeZee({
  variable: "--font-abeezee",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Commonsia",
  description:
    "Connect with mentors, discuss design, and grow with the architecture student community.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth">
      <body
        className={`${poppins.variable} ${abeeZee.variable} ${poppins.className} min-h-screen bg-[#ffffff] font-sans text-neutral-900 antialiased`}
      >
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
