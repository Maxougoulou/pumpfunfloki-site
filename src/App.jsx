import { motion } from "framer-motion";
import {
  Copy,
  ExternalLink,
  Shield,
  Flame,
  Users,
  Rocket,
  HelpCircle,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const CONTRACT = "DPgo26tLZXdNfB24ahP2LTXsxSPxvxPq7takvavppump";

// Put your real links here:
const BUY_LINK = "https://dexscreener.com/solana/eeb1xu5dp9iz573spxxsubjvpduxdr7knpbrrynfl91z";
const PUMPFUN_LINK = "https://pump.fun/coin/DPgo26tLZXdNfB24ahP2LTXsxSPxvxPq7takvavppump";
const X_LINK = "https://x.com/PumpFunFlokiSol";
const TG_LINK = "https://t.me/PumpFunFlokiArmy";
const EMAIL = "pumpfunfloki.cto@gmail.com";

// Put your logo in: public/assets/logo.png
const LOGO_SRC = "/assets/logo.png";

function NeonButton({ href, children, variant = "solid", full = false }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition will-change-transform";
  const solid =
    "bg-neon-500 text-black shadow-neonStrong hover:translate-y-[-1px] hover:bg-neon-400";
  const outline =
    "border border-neon-500/40 text-white shadow-neon hover:translate-y-[-1px] hover:border-neon-500/70";

  return (
    <a
      href={href}
      className={`${base} ${variant === "solid" ? solid : outline} ${
        full ? "w-full" : ""
      }`}
      target="_blank"
      rel="noreferrer"
    >
      {children}
      <ExternalLink size={16} />
    </a>
  );
}

function SectionTitle({ kicker, title, desc }) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div>
        {/* Kicker (TOKEN, ROADMAP, FAQ, etc.) */}
        {kicker ? (
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-400 shadow-neon" />
            <span className="text-sm font-extrabold tracking-widest uppercase text-neon-400 text-glow drop-shadow-[0_0_14px_rgba(0,232,90,.45)]">
              {kicker}
            </span>
          </div>
        ) : null}

        {/* Main title */}
        <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-white text-glow drop-shadow-[0_0_18px_rgba(0,232,90,.25)]">
          {title}
        </h2>

        {/* Description under title */}
        {desc ? (
          <p className="mt-3 text-base text-white/90 drop-shadow-[0_0_10px_rgba(0,0,0,.6)] max-w-2xl">
            {desc}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ContractCard() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(CONTRACT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs text-white/70">Contract</div>
      <div className="mt-2 flex items-center gap-3">
        <code className="text-sm text-neon-300 break-all">{CONTRACT}</code>
        <button
          onClick={copy}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-neon-500/30 px-3 py-2 text-xs hover:border-neon-500/60"
        >
          <Copy size={16} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function Card({ title, icon, children }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-neon-500/25 p-2 text-neon-300 shadow-neon">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      <div className="mt-3 text-[15px] md:text-sm text-white/75 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

const roadmap = [
  {
    title: "Phase 1 — Foundation & Fire",
    range: "→ 500k MCAP",
    points: [
      "Solid token presence + brand identity",
      "Consistent community raids & content output",
      "Supply burn milestone at 75k MCAP",
      "Target: 4k–5k holders + strong floor",
    ],
  },
  {
    title: "Phase 2 — Entry to Legitimacy",
    range: "500k → 1.5M",
    points: [
      "Burn remaining supply milestone at 1M MCAP",
      "Referral & growth loops",
      "DAO-lite community council",
      "Genesis NFT drop + early utility routes",
      "CEX prep & outreach",
    ],
  },
  {
    title: "Phase 3 — Domination Wave",
    range: "1.5M → 5M",
    points: [
      "Liquidity strengthening + wider narrative reach",
      "Major community campaigns + partnerships",
      "Listings + market maker engagement",
      "Target: 10k–12k holders",
    ],
  },
  {
    title: "Phase 4 — Legend Moment",
    range: "5M → 10M",
    points: [
      "World-stage narrative push",
      "IRL presence & big placements (if aligned)",
      "IP protection & trademarks",
      "Global CEX collaboration possibilities",
      "Target: 12k–18k holders",
    ],
  },
];

function Roadmap() {
  return (
    <section id="roadmap" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <SectionTitle
        kicker="Roadmap"
        title="Path to Glory"
        desc="Four phases. Clear targets. Community-powered execution."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {roadmap.map((p) => (
          <div key={p.title} className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-white">{p.title}</h3>
              <span className="rounded-full border border-neon-500/25 px-3 py-1 text-xs text-neon-300">
                {p.range}
              </span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-white/75">
              {p.points.map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-neon-500 shadow-neon" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function TokenBanner() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="relative overflow-hidden rounded-2xl">
        <img
          src="/assets/banner-token.jpg"
          alt="PumpFun Floki banner"
          className="w-full h-[200px] sm:h-[300px] md:h-[400px] object-cover"
        />

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-bg" />

        {/* Soft glow */}
        <div className="pointer-events-none absolute inset-0 shadow-[0_0_100px_rgba(0,232,90,.25)]" />
      </div>
    </section>
  );
}

function VideoBanner() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="relative overflow-hidden rounded-2xl">
        {/* VIDEO */}
        <video
          className="w-full h-[200px] sm:h-[300px] md:h-[400px] object-cover"
          src="/assets/pff-2026.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />

        {/* Dark overlay pour lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-bg" />

        {/* Soft glow */}
        <div className="pointer-events-none absolute inset-0 shadow-[0_0_100px_rgba(0,232,90,.25)]" />
      </div>
    </section>
  );
}


function PhotoSliderOnly() {
  const items = [
    { type: "image", src: "/assets/gallery/communi1.png" },
    { type: "video", src: "/assets/gallery/community-video.mp4" },
    { type: "image", src: "/assets/gallery/communi2.png" },
  ];

  function scrollByAmount(dir) {
    const el = document.getElementById("pff-photo-only-track");
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.85);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      {/* Desktop arrows */}
      <div className="flex justify-end mb-4">
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scrollByAmount(-1)}
            className="glass rounded-xl px-3 py-2 text-sm text-white/80 hover:text-white border border-neon-500/20 hover:border-neon-500/50"
          >
            ←
          </button>
          <button
            onClick={() => scrollByAmount(1)}
            className="glass rounded-xl px-3 py-2 text-sm text-white/80 hover:text-white border border-neon-500/20 hover:border-neon-500/50"
          >
            →
          </button>
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-bg to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-bg to-transparent z-10" />

        <div
          id="pff-photo-only-track"
          className="flex gap-4 md:gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth
                   [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          <style>{`
            #pff-photo-only-track::-webkit-scrollbar { display: none; }
          `}</style>

          {items.map((item, i) => (
            <div
              key={i}
              className="snap-start shrink-0 overflow-hidden rounded-2xl
                         border border-neon-500/20 bg-black/40
                         w-[84vw] sm:w-[58vw] md:w-[360px] lg:w-[420px]"
              style={{ aspectRatio: "3 / 4" }}
            >
              {item.type === "image" ? (
                <img
                  src={item.src}
                  alt={`Gallery item ${i + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <video
                  src={item.src}
                  className="h-full w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}




function TokenDetails() {
  return (
    <section id="token" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <SectionTitle
        kicker="Token"
        title="Token Details"
        desc="Quick reference for holders and raiders."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Card title="Community First" icon={<Users size={18} />}>
          $PFF is a meme-first movement. The culture is the utility: raids, memes,
          lore and community-driven momentum.
        </Card>

        <Card title="Burn & Buyback Mindset" icon={<Flame size={18} />}>
          Milestone-based burns and buyback energy. The goal is to keep pressure
          high and the vibe clean.
        </Card>

        <Card title="Safety Basics" icon={<Shield size={18} />}>
          Always verify the contract before buying. Never trust random DMs. Use
          official links only.
        </Card>

        <div className="glass rounded-2xl p-6 md:col-span-2 lg:col-span-3">
          <div className="text-sm text-white/70">Contract</div>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <code className="text-neon-300 break-all">{CONTRACT}</code>
            <div className="grid grid-cols-1 sm:flex gap-3">
              <NeonButton href={BUY_LINK} full>
                Buy on Dexscreener
              </NeonButton>
              <NeonButton href={PUMPFUN_LINK} variant="outline" full>
                Pump.fun
              </NeonButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowToBuy() {
  return (
    <section id="howtobuy" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <SectionTitle
        kicker="Guide"
        title="How to Buy"
        desc="Fast steps. Don’t overthink it. Verify links and contract."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-neon-500/25 p-2 text-neon-300 shadow-neon">
              <Rocket size={18} />
            </div>
            <h3 className="text-lg font-bold text-white">Steps</h3>
          </div>

          <ol className="mt-4 space-y-3 text-sm text-white/75">
            <li className="flex gap-3">
              <span className="text-neon-300 font-semibold">1.</span>
              <span>
                Open the official chart / buy link (Dexscreener or Pump.fun).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-neon-300 font-semibold">2.</span>
              <span>Confirm the contract matches the one on this site.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-neon-300 font-semibold">3.</span>
              <span>Buy $PFF. Keep slippage reasonable. Avoid fake tokens.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-neon-300 font-semibold">4.</span>
              <span>Join community channels and follow announcements.</span>
            </li>
          </ol>
        </div>

        <div className="grid gap-5">
          <ContractCard />

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-neon-500/25 p-2 text-neon-300 shadow-neon">
                <HelpCircle size={18} />
              </div>
              <h3 className="text-lg font-bold text-white">Pro Tips</h3>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-white/75">
              <li>• Never buy from random links in DMs.</li>
              <li>• Bookmark the official site and chart.</li>
              <li>• If it looks too good to be true, it’s probably a scam.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommunityGallery() {
  const images = [
    "/assets/gallery/community1.png",
    "/assets/gallery/community2.png",
    "/assets/gallery/community3.png",
    "/assets/gallery/community4.png",
    "/assets/gallery/community5.png",
    "/assets/gallery/community6.png",
    "/assets/gallery/community7.png",
    "/assets/gallery/community8.png",
  ];

  function scrollByAmount(dir) {
    const el = document.getElementById("pff-gallery-track");
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.85);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }

  return (
    <section id="gallery" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <div className="flex items-end justify-between gap-4">
        <SectionTitle
          kicker="Community"
          title="Community Creations"
          desc="Art, memes, posters and visuals forged by the $PFF community."
        />

        {/* Desktop arrows */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scrollByAmount(-1)}
            className="glass rounded-xl px-3 py-2 text-sm text-white/80 hover:text-white border border-neon-500/20 hover:border-neon-500/50"
          >
            ←
          </button>
          <button
            onClick={() => scrollByAmount(1)}
            className="glass rounded-xl px-3 py-2 text-sm text-white/80 hover:text-white border border-neon-500/20 hover:border-neon-500/50"
          >
            →
          </button>
        </div>
      </div>

      {/* Slider wrapper with fades */}
      <div className="relative mt-10">
        <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-bg to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-bg to-transparent z-10" />

        {/* Slider track */}
        <div
          id="pff-gallery-track"
          className="flex gap-4 md:gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth
                   [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {/* Hide scrollbar (WebKit) */}
          <style>{`
            #pff-gallery-track::-webkit-scrollbar { display: none; }
          `}</style>

          {images.map((src, i) => (
            <div
              key={i}
              className="group relative snap-start shrink-0 overflow-hidden rounded-2xl
                       bg-black/40 border border-neon-500/20
                       w-[84vw] sm:w-[58vw] md:w-[360px] lg:w-[420px]"
              style={{ aspectRatio: "3 / 4" }}
            >
              <img
                src={src}
                alt={`Community creation ${i + 1}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />

              {/* Glow overlay */}
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute inset-0 shadow-[0_0_90px_rgba(0,232,90,.25)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: "What is PumpFun Floki ($PFF)?",
      a: "A meme-first community token with viking neon lore — built around culture, raids, and momentum.",
    },
    {
      q: "Is there a team / utility / roadmap?",
      a: "The roadmap is community-driven. Utility can evolve, but the core is memetics + community execution.",
    },
    {
      q: "Where can I buy?",
      a: "Use the official links (Dexscreener / Pump.fun). Always verify the contract before buying.",
    },
    {
      q: "Is this financial advice?",
      a: "No. Meme coin culture. High risk. Only spend what you can afford to lose.",
    },
  ];

  return (
    <section id="faq" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <SectionTitle
        kicker="FAQ"
        title="Frequently Asked Questions"
        desc="Short answers. Clear vibes."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {items.map((x) => (
          <div key={x.q} className="glass rounded-2xl p-6">
            <div className="font-bold text-white">{x.q}</div>
            <div className="mt-2 text-sm text-white/75 leading-relaxed">{x.a}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <main className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-[url('/assets/hero.jpg')] bg-cover bg-center opacity-55"
          aria-hidden
        />
        <div className="absolute inset-0 bg-noise" aria-hidden />
        <div
          className="absolute inset-0 bg-grid [background-size:64px_64px] opacity-25"
          aria-hidden
        />
        <div className="absolute inset-0 grain" aria-hidden />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/30 via-bg/70 to-bg"
          aria-hidden
        />
      </div>

      {/* Nav */}
      <header className="relative mx-auto max-w-6xl px-4 pt-6">
        <div className="relative">
          <nav className="glass flex items-center justify-between rounded-2xl px-4 py-3">
            <a
              href="#"
              className="flex items-center gap-3 font-extrabold tracking-tight"
            >
              <img
                src={LOGO_SRC}
                alt="Floki logo"
                className="h-9 w-9 rounded-full object-contain drop-shadow-[0_0_18px_rgba(0,232,90,.35)]"
              />
              <div className="leading-none">
                <div className="flex items-center gap-2">
                  <span className="text-neon-300 text-glow">PumpFun</span>
                  <span className="text-white">Floki</span>
                  <span className="text-xs text-white/50">($PFF)</span>
                </div>
                <div className="mt-1 text-[11px] text-white/55">
                  The Viking Returns
                </div>
              </div>
            </a>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-4">
              <a className="text-sm text-white/70 hover:text-white" href="#token">
                Token
              </a>
              <a
                className="text-sm text-white/70 hover:text-white"
                href="#roadmap"
              >
                Roadmap
              </a>
              <a
                className="text-sm text-white/70 hover:text-white"
                href="#howtobuy"
              >
                How to Buy
              </a>
              <a
                className="text-sm text-white/70 hover:text-white"
                href="#gallery"
              >
                Creations
              </a>
              <a className="text-sm text-white/70 hover:text-white" href="#faq">
                FAQ
              </a>
              <NeonButton href={BUY_LINK} variant="outline">
                Buy $PFF
              </NeonButton>
            </div>

            {/* Mobile burger */}
            <button
              className="md:hidden inline-flex items-center justify-center rounded-xl border border-neon-500/25 px-3 py-2 text-white/80 hover:text-white"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </nav>

          {/* Mobile dropdown */}
          {mobileOpen && (
            <div className="md:hidden absolute left-0 right-0 mt-3 glass rounded-2xl p-4 z-50">
              <div className="flex flex-col gap-3">
                <a
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-white/80 hover:text-white"
                  href="#token"
                >
                  Token
                </a>
                <a
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-white/80 hover:text-white"
                  href="#roadmap"
                >
                  Roadmap
                </a>
                <a
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-white/80 hover:text-white"
                  href="#howtobuy"
                >
                  How to Buy
                </a>
                <a
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-white/80 hover:text-white"
                  href="#gallery"
                >
                  Creations
                </a>
                <a
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-white/80 hover:text-white"
                  href="#faq"
                >
                  FAQ
                </a>

                <div className="pt-2">
                  <NeonButton href={BUY_LINK} full>
                    Buy $PFF
                  </NeonButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 pt-12 md:pt-14 pb-10 md:pb-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-glow text-white"
            >
              The Viking Returns.
              <span className="block text-white/80">
                On Pump For Fun
              </span>
            </motion.h1>

            <p className="mt-4 text-white/70 max-w-xl leading-relaxed">
          $PFF is PumpFun Floki — a new era of meme coin forged in the wild lands of PumpFun. Inspired by the OG meme FLOKI, the spirit of the Viking lives on: mischievous, fearless, and ready to raid the timeline.
Backed by the most powerful meme culture in crypto history, $PFF is not just a coin — it’s a movement.


            </p>

            {/* Responsive buttons */}
            <div className="mt-6 grid grid-cols-1 sm:flex sm:flex-wrap gap-3">
              <NeonButton href={BUY_LINK} full>
                Buy $PFF
              </NeonButton>

             
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="glass rounded-2xl p-4">
                <div className="text-xs text-white/60">Narrative</div>
                <div className="mt-1 font-semibold text-neon-300 text-glow">
                  Viking Lore
                </div>
              </div>
              <div className="glass rounded-2xl p-4">
                <div className="text-xs text-white/60">Mission</div>
                <div className="mt-1 font-semibold text-neon-300 text-glow">
                  Community First
                </div>
              </div>
            </div>

            <div className="mt-6">
              <ContractCard />
            </div>
          </div>

          {/* Mascot image (NO BORDER / NO GLASS) */}
          <div className="relative mx-auto max-w-[520px] lg:max-w-none">
            <img
              src="/assets/floki.png"
              alt="PumpFun Floki mascot"
              className="w-full object-contain drop-shadow-[0_0_35px_rgba(0,232,90,.25)]"
            />

            <div
              className="pointer-events-none absolute -inset-8 -z-10 rounded-[2rem] blur-2xl opacity-60"
              style={{ boxShadow: "0 0 220px rgba(0,232,90,.20)" }}
            />
          </div>
        </div>
      </section>

      {/* About / Value props */}
      <section id="about" className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-5 md:grid-cols-3">
          <Card title="Culture = Utility" icon={<Users size={18} />}>
            Memes, lore and community execution are the real product. If the
            vibe is strong, everything follows.
          </Card>
          <Card title="Raid Ready" icon={<Rocket size={18} />}>
            Built for fast content cycles: posters, edits, lightning visuals,
            and “locked-in” narrative pushes.
          </Card>
          <Card title="Verify Everything" icon={<Shield size={18} />}>
            Only trust official channels. Always compare the contract with the
            one displayed on this site.
          </Card>
        </div>
      </section>


      <PhotoSliderOnly/>
      <TokenDetails />
       <VideoBanner/>
      <Roadmap />
      <TokenBanner />
      <HowToBuy />
      <CommunityGallery />
      <FAQ />

      {/* Footer */}
      <footer className="relative mx-auto max-w-6xl px-4 pb-14">
        <div className="glass rounded-2xl p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-bold text-white">Join the raid</div>
            <div className="text-sm text-white/70">
              X • Telegram • Email:{" "}
              <a
                className="text-neon-300 hover:underline"
                href={`mailto:${EMAIL}`}
              >
                {EMAIL}
              </a>
            </div>
          </div>
          <div className="flex gap-3">
            <NeonButton href={X_LINK} variant="outline">
              X / Twitter
            </NeonButton>
            <NeonButton href={TG_LINK} variant="outline">
              Telegram
            </NeonButton>
          </div>
        </div>

        <div className="mt-6 text-xs text-white/45">
          Disclaimer: meme coin. NFA. High risk. Verify links and contract.  -- PumpFunFloki 
        </div>
      </footer>
    </main>
  );
}
