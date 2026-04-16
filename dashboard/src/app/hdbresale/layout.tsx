import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HDB Resale Dashboard",
  description:
    "Interactive dashboard to explore and analyse historical HDB resale flat transactions in Singapore with maps, charts and price predictions.",
  openGraph: {
    title: "HDB Resale Dashboard",
    description:
      "Interactive dashboard to explore and analyse historical HDB resale flat transactions in Singapore with maps, charts and price predictions.",
    images: [
      {
        url: "/og-image-hdb.png",
        width: 1300,
        height: 730,
        alt: "HDB Resale Dashboard Preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HDB Resale Dashboard",
    description:
      "Interactive dashboard to explore and analyse historical HDB resale flat transactions in Singapore.",
    images: ["/og-image-hdb.png"],
  },
};

export default function HdbResaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
