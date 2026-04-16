import type { Metadata } from "next";
import Link from "next/link";
import { LineChart, ArrowRight, Construction, Github } from "lucide-react";

export const metadata: Metadata = {
  title: "Web Applications Portfolio",
  description:
    "A growing collection of interactive web applications built with love.",
  openGraph: {
    title: "Web Applications Portfolio",
    description:
      "A growing collection of interactive web applications built with love.",
    images: [
      {
        url: "/og-image-hdb.png",
        width: 1300,
        height: 730,
        alt: "Web Applications Portfolio Preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Web Applications Portfolio",
    description:
      "A growing collection of interactive web applications built with love.",
    images: ["/og-image-hdb.png"],
  },
};

const icons: Record<string, React.ReactNode> = {
  hdbresale: <LineChart className="w-6 h-6 text-dark-primary" />,
  placeholder: <Construction className="w-6 h-6 opacity-60 text-dark-primary" />,
};

const applications = [
  {
    id: "hdbresale",
    title: "HDB Resale Prices",
    description:
      "Explore and analyze historical HDB resale flat transactions in Singapore with interactive maps and charts.",
    href: "/hdbresale",
    githubHref: "https://github.com/cheeyeelim/hdb-resale-app-open-source",
    status: "live",
  },
  {
    id: "placeholder",
    title: "Coming Soon",
    description: "Future application coming soon.",
    href: "",
    githubHref: "",
    status: "",
  },
];

export default function Home() {

  return (
    <div className="min-h-screen bg-light-primary text-slate-800 selection:bg-dark-secondary/30 font-sans">
      <main className="max-w-7xl mx-auto px-6 py-20 md:py-32 space-y-16">
        <header className="space-y-6 max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-dark-primary mb-6">
            Web <span className="text-transparent bg-clip-text bg-gradient-to-r from-dark-primary to-dark-secondary">Applications</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-700 leading-relaxed">
            A growing collection of interactive web applications built with love.
            Select an application below to explore more.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {applications.map((dashboard) => (
            dashboard.status === "live" ? (
              <div
                key={dashboard.id}
                className={`group relative flex flex-col p-8 rounded-3xl border border-dark-primary/20 bg-gradient-to-br from-dark-secondary/40 to-white/60 bg-white/30 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-dark-primary/10 hover:-translate-y-1 hover:border-dark-primary/50`}
              >
                <div className="flex-1">
                  <div className="p-3 bg-white/80 rounded-2xl inline-block mb-6 ring-1 ring-dark-primary/10 group-hover:ring-dark-primary/30 transition-all shadow-inner">
                    {icons[dashboard.id]}
                  </div>
                  <h2 className="text-2xl font-bold mb-3 text-dark-primary group-hover:text-dark-secondary transition-colors">
                    {dashboard.title}
                  </h2>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    {dashboard.description}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-auto">
                  <Link
                    href={dashboard.href}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-dark-primary text-white hover:bg-dark-secondary transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Open App
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href={dashboard.githubHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-dark-primary/80 hover:text-dark-primary transition-all duration-200"
                  >
                    <Github className="w-3.5 h-3.5" />
                    View Source
                  </Link>
                </div>
              </div>
            ) : (
              <div key={dashboard.id} className="flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-dark-primary/20 bg-white/30 text-slate-500 min-h-[320px] transition-colors hover:bg-white/50 hover:border-dark-primary/30">
                <div className="p-4 rounded-full bg-white/80 mb-5 ring-1 ring-dark-primary/10 shadow-inner">
                  {icons[dashboard.id]}
                </div>
                <h3 className="text-lg font-semibold text-dark-primary opacity-80">{dashboard.title}</h3>
                <p className="text-sm text-center mt-2 max-w-[200px] text-slate-600">
                  {dashboard.description}
                </p>
              </div>
            )
          ))}

        </div>
      </main>
    </div>
  );
}
