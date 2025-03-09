import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "react-hot-toast";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "High_Up",
  description: "A modern social media web application powered by next.Js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>

    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
            <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
          <div className="min-h-screen">
            <Navbar />

            <main className="py-8">
            {/* Container as usual to center content ;) */}
            <div className="max-w-6xl mx-auto px-4">

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                <div className="hidden lg:block lg:col-span-3">
                  <Sidebar />
                </div>
                
                <div className="lg:col-span-9">
                  {children}
                </div>

              </div>

            </div>

            </main>


          </div>
          <Toaster />
          </ThemeProvider>
        
      </body>
    </html>
    </ClerkProvider>
  );
}
