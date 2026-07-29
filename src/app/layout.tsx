import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/ui/Navigation";
import BiomedicalBackground from "@/components/ui/BiomedicalBackground";
export const metadata: Metadata = {
  title: "KinomeX - Human Kinome Explorer",
  description:
    "Explore the human kinome with interactive visualizations, pathway analysis, and AI-powered search across 518+ kinases.",
  keywords: [
    "kinome",
    "kinase",
    "phosphorylation",
    "signal transduction",
    "proteomics",
    "bioinformatics",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-kinome-dark antialiased">
        <BiomedicalBackground />
        <Navigation />
        <main className="pt-16 relative z-10">{children}</main>
      </body>
    </html>
  );
}
