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
import PFFSwarmOracleHub from "./components/PFFSwarmOracle";
import ValhallaAdmin from "./components/ValhallaAdmin";

const CONTRACT = "DPgo26tLZXdNfB24ahP2LTXsxSPxvxPq7takvavppump";

// Links
const BUY_LINK =
  "https://dexscreener.com/solana/eeb1xu5dp9iz573spxxsubjvpduxdr7knpbrrynfl91z";
const PUMPFUN_LINK = "https://pump.fun/coin/DPgo26tLZXdNfB24ahP2LTXsxSPxvxPq7takvavppump";
const X_LINK = "https://x.com/PumpfunFlokiCTO";
const TG_LINK = "https://t.me/PumpFunFlokiArmy";
const EMAIL = "pumpfunfloki.cto@gmail.com";
const PUMPSWAP_LINK = "https://swap.pump.fun/?input=So11111111111111111111111111111111111111112&output=DPgo26tLZXdNfB24ahP2LTXsxSPxvxPq7takvavppump"; // mets le vrai lien
const JUPITER_LINK = "https://jup.ag/tokens/DPgo26tLZXdNfB24ahP2LTXsxSPxvxPq7takvavppump"; 
const APPLEPAY_LINK = BUY_LINK;
const VISA_LINK = BUY_LINK;
const TIKTOK_LINK = "https://tiktok.com/@pumpfun.floki.off";
const X_COMMUNITY_LINK = "https://x.com/i/communities/yourcommunityid";




// Put your logo in: public/assets/logo.png
const LOGO_SRC = "/assets/logo.png";

// Tokenomics constants
const TOKEN_NAME = "PumpFunFloki (PFF)";
const BLOCKCHAIN = "Solana";
const DECIMALS = "6";
const CIRC_SUPPLY = "~949M PFF";
const LAUNCH_TYPE = "Pump.fun Fair Launch";

const DEV_LOCK_11_WALLET = "8KmGi6xgzacP6W8DmSd19GYxks5MqHEoWif3cMK7NW6V";
const DEV_LOCK_11_STREAMFLOW =
  "https://app.streamflow.finance/contract/solana/mainnet/98uodYWp1r2nBN1gRL1ffhmrc17bpn4DVABV4SJMJRMD";

const DEV_LOCK_2_WALLET = "D9vBCeSKrZZC82qntKJZEBE99EGEPREtiwo17bFRT88f";
const DEV_LOCK_2_STREAMFLOW =
  "https://app.streamflow.finance/contract/solana/mainnet/9qNk8Cr2CaCD834iR7Voxz6Ec7KaYD4h1aEEddySJN5b";

const BURN_5_WALLET = "D1PuXuCy2HVri1qBenVEoWURXhcnVThRzBp86kVYAWtN";

const CREATOR_FEE_WALLET = "5XovpHJKGk8pfF4dKttGRU9zmmV3XahzXhaY2qfP6BxQ";
const TEMP_REWARDS_WALLET = "D6o72zx1Y8ZRo87C4ZNthfWBJXYKwhrjWEz2HowHPQ9u";

function NeonButton({ href, children, variant = "solid", full = false, className = "" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition will-change-transform";
  const solid =
    "bg-neon-500 text-black shadow-neonStrong hover:translate-y-[-2px] hover:bg-neon-400 active:translate-y-0";
  const outline =
    "border border-neon-500/50 bg-white/[0.04] text-white/90 hover:bg-neon-500/10 hover:border-neon-500 hover:text-white hover:translate-y-[-2px] active:translate-y-0";

  const isExternal = href?.startsWith("http");

  return (
    <a
      href={href}
      className={`${base} ${variant === "solid" ? solid : outline} ${
        full ? "w-full" : ""
      } ${className}`}
      {...(isExternal && { target: "_blank", rel: "noreferrer" })}
    >
      {children}
      {isExternal && <ExternalLink size={16} />}
    </a>
  );
}

function SectionTitle({ kicker, title, desc }) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div>
        {kicker ? (
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-400 shadow-neon" />
            <span className="text-sm font-extrabold tracking-widest uppercase text-neon-400 text-glow drop-shadow-[0_0_14px_rgba(0,232,90,.45)]">{kicker}</span>
          </div>
        ) : null}

        <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-white text-glow drop-shadow-[0_0_18px_rgba(0,232,90,.25)]">
          {title}
        </h2>

        {desc ? (
          <p className="mt-3 text-base text-white/90 drop-shadow-[0_0_10px_rgba(0,0,0,.6)] max-w-2xl">
            {desc}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1100);
    } catch {}
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-neon-500/15 bg-black/20 p-3">
      <div className="min-w-0">
        <div className="text-xs text-white/60">{label}</div>
        <code className="mt-1 block text-sm text-neon-300 break-all">{value}</code>
      </div>
      <button
        onClick={copy}
        className="sm:ml-4 inline-flex items-center justify-center gap-2 rounded-xl border border-neon-500/25 px-3 py-2 text-xs text-white/80 hover:text-white hover:border-neon-500/55"
      >
        <Copy size={16} />
        {copied ? "Copied" : "Copy"}
      </button>
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
    <div className="rounded-2xl border border-neon-500/20 bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-bold tracking-widest uppercase text-white/40">Official Contract</span>
        {copied && (
          <span className="text-[10px] text-neon-400 font-bold animate-fade-in">✓ Copied!</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <code className="flex-1 text-xs text-neon-300/90 break-all leading-relaxed font-mono">{CONTRACT}</code>
        <button
          onClick={copy}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-neon-500/30 bg-neon-500/[0.06] px-3 py-2 text-xs text-white/80 hover:border-neon-500/60 hover:bg-neon-500/12 hover:text-white transition"
        >
          <Copy size={13} />
          Copy
        </button>
      </div>
    </div>
  );
}

function Card({ title, icon, children }) {
  return (
    <div className="glass rounded-2xl overflow-hidden group hover:border-neon-500/35 transition-colors duration-300">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-neon-500/50 to-transparent" />
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-neon-500/30 bg-neon-500/[0.08] p-2.5 text-neon-400 shadow-neon group-hover:bg-neon-500/15 transition-colors">
            {icon}
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <div className="mt-4 text-sm text-white/70 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

const roadmap = [
  {
    title: "Phase 1 — Foundation & Fire",
    range: "→ 500K MCAP",
    meta: {
      targets: "500K MCAP | 4K–5K holders",
      focus: "build engine + credibility + ignition",
    },
    sections: [
      {
        label: "Tokenomics / Narrative",
        items: ["🔥 Burn 5% of supply at 75K MCAP", "Regular buybacks from creator fees"],
      },
      {
        label: "Community",
        items: [
          "Social flywheel — creator fees as rewards (creators, bagworkers, contests etc.)",
          "Expand PFF RAID ARMY (divisions + missions)",
          "Launch PFF Meme Guild",
          "Weekly engagement missions begin",
        ],
      },
      {
        label: "Trust & Structure",
        items: ["Team and Moderator expansion", "Survival / continuity framework drafted"],
      },
      {
        label: "Discovery & Momentum",
        items: ["CG optimized", "CMC live", "Dexscreener boosts", "Viking narrative strong"],
      },
      {
        label: "Brand Identity",
        items: [
          "Begin building official brand asset foundation",
          "Establish unique PFF visual identity + mascot direction",
        ],
      },
      {
        label: "Utility",
        items: ["NFT Strategy set up — define details", "$PUMP ecosystem — identify integration paths"],
      },
    ],
  },

  {
    title: "Phase 2 — Entry to Legitimacy",
    range: "500K → 1.5M",
    meta: {
      targets: "1.5M MCAP | 6K–8K holders",
      focus: "real-world entry + trust lock + accessibility",
    },
    sections: [
      {
        label: "Tokenomics / Narrative",
        items: ["🔥 Burn remaining 5% of supply at 1M MCAP", "Regular buybacks from creator fees"],
      },
      {
        label: "Community Growth",
        items: ['Referral Campaign — “Bring 1 Viking Home”', "DAO-Lite / Community Council launched"],
      },
      {
        label: "Trust & Security",
        items: [
          "Multi-Sig Treasury LIVE — two level war chest long with Pump.fun creator fees wallet",
          "Global Moderator program active",
          "Partnerships / BD function operational",
        ],
      },
      {
        label: "Liquidity & Listings",
        items: [
          "Exchange Readiness Phase completed",
          "Supply reserve locked for CEX liquidity",
          "Planned LP strengthening begins",
        ],
      },
      {
        label: "IRL & Visibility",
        items: [
          "Vegas / London / Dubai / Singapore billboards",
          "Every IRL = cinematic content rule enforced",
        ],
      },
      {
        label: "Brand Identity",
        items: [
          "Professional branding and design team",
          "Formalize PFF Brand Canon + Style Guide",
          "Begin initial IP/trademark consultation + documentation",
        ],
      },
      { label: "CEX", items: ["First CEX listing (Target: MEXC)"] },
      { label: "Utility", items: ["Genesis NFT Collection launch", "$PUMP utility v1 explore rollout"] },
    ],
  },

  {
    title: "Phase 3 — Domination Wave",
    range: "1.5M → 5M",
    meta: {
      targets: "5M MCAP | 10K–12K holders",
      focus: "cultural dominance + liquidity power + expansion",
    },
    sections: [
      {
        label: "Phase 3 Internal Checkpoints",
        items: [
          "🛡 1.5M → 3M: community deepening",
          "🛡 1.5M → 3M: visibility cycles",
          "🛡 1.5M → 3M: LP reinforcement",
          "⚔️ 3M → 5M: scale narrative",
          "⚔️ 3M → 5M: expand influence",
        ],
      },
      {
        label: "Community Power",
        items: [
          "DAO-Lite voting active",
          "Raid & Meme Guild expansion",
          "Referral Campaign Round 2",
          "Regular buybacks from creator fees",
        ],
      },
      { label: "Trust & Ops", items: ["Ops structure strengthened", "Partnership BD scaling"] },
      {
        label: "Listings & Liquidity",
        items: [
          "Strong liquidity milestones reinforced",
          "2nd CEX listing (Gate.io / BitMart)",
          "Market maker engagement formalized",
        ],
      },
      { label: "Brand Identity", items: ["Finalize IP strategy + priority trademark filings"] },
      {
        label: "IRL & Brand Impact",
        items: [
          "Repeat city billboard cycles for persistence",
          "A Global Viking Army Event / Record Breaking Cultural Movement",
          "Presence at major crypto conferences",
        ],
      },
    ],
  },

  {
    title: "Phase 4 — Legend Moment",
    range: "5M → 10M",
    meta: {
      targets: "10M MCAP | 12K–18K holders",
      focus: "world-stage arrival + cultural stamp",
    },
    sections: [
      { label: "Buybacks", items: ["Regular buybacks from creator fees"] },
      { label: "Narrative Peak", items: ["Global arrival story"] },
      { label: "IRL", items: ["Times Square takeover", "Full cinematic global highlight drop"] },
      {
        label: "Brand Identity",
        items: [
          "Complete key trademark protections",
          "Secure PFF as a globally recognized protected brand IP",
        ],
      },
      {
        label: "Brand Maturity",
        items: ["Charity / goodwill move (optional, smart timing)", "Expanded physical world footprint"],
      },
      { label: "CEX Position", items: ["Eligibility conversations with KuCoin / Bybit / OKX / Kraken"] },
    ],
  },
];


function Roadmap() {
  return (
    <section id="roadmap" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <SectionTitle
        kicker="Roadmap"
        title="Path to Glory - PFF roadmap to 10M market cap"
        desc="This is only the opening march toward Valhalla.
The 10M path represents the first operational phase of a much larger vision. As experience compounds and community insight deepens, the roadmap will be refined, expanded, and extended all the way to Valhalla."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {roadmap.map((p, idx) => (
          <div key={p.title} className="glass rounded-2xl overflow-hidden group hover:border-neon-500/30 transition-colors">
            {/* Phase header with accent bar */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-neon-500/50 to-transparent" />
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-neon-500/15 border border-neon-500/30 text-neon-400 text-xs font-extrabold">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-white/40 font-bold uppercase tracking-widest">Phase {idx + 1}</span>
                  </div>
                  <h3 className="text-base font-extrabold text-white leading-snug">{p.title}</h3>
                </div>
                <span className="shrink-0 rounded-full border border-neon-500/30 bg-neon-500/[0.07] px-3 py-1 text-xs font-semibold text-neon-300">
                  {p.range}
                </span>
              </div>

              {/* Targets / Focus */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-black/25 border border-neon-500/10 px-3 py-2">
                  <div className="text-[10px] text-white/40 uppercase tracking-wide font-bold mb-0.5">Target</div>
                  <div className="text-xs text-white/80">{p.meta?.targets}</div>
                </div>
                <div className="rounded-xl bg-black/25 border border-neon-500/10 px-3 py-2">
                  <div className="text-[10px] text-white/40 uppercase tracking-wide font-bold mb-0.5">Focus</div>
                  <div className="text-xs text-white/80">{p.meta?.focus}</div>
                </div>
              </div>

              {/* Section groups */}
              <div className="mt-5 space-y-3 text-sm text-white/70">
                {(p.sections || []).map((sec) => (
                  <div key={sec.label}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="h-px flex-1 bg-neon-500/10" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neon-400/80">{sec.label}</span>
                      <span className="h-px flex-1 bg-neon-500/10" />
                    </div>
                    <ul className="space-y-1.5 pl-1">
                      {(sec.items || []).map((it) => (
                        <li key={it} className="flex gap-2 text-[13px]">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-neon-500/60 shrink-0" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-bg" />
        <div className="pointer-events-none absolute inset-0 shadow-[0_0_100px_rgba(0,232,90,.25)]" />
      </div>
    </section>
  );
}

function VideoBanner() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="relative overflow-hidden rounded-2xl">
        <video
          className="w-full h-[200px] sm:h-[300px] md:h-[400px] object-cover"
          src="/assets/pff-2026.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-bg" />
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
    { type: "video", src: "/assets/gallery/commvideo1.mp4" },
    { type: "image", src: "/assets/gallery/communi3.jpg" },
    { type: "video", src: "/assets/gallery/commvideo2.mp4" },
    { type: "image", src: "/assets/gallery/communi4.jpg" },
  ];

  function scrollByAmount(dir) {
    const el = document.getElementById("pff-photo-only-track");
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.85);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
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



function Tokenomics() {
  return (
    <section id="tokenomics" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <SectionTitle
        kicker="Tokenomics"
        title="Tokenomics & Structure"
        desc="Publicly verifiable locks, milestone burns, and transparent treasury rails."
      />

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {/* Token Overview */}
        <div className="glass rounded-2xl p-6 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-neon-500/25 p-2 text-neon-300 shadow-neon">
              <Users size={18} />
            </div>
            <h3 className="text-lg font-bold text-white">Token Overview</h3>
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/75">
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/55">Token Name</span>
              <span className="text-white">{TOKEN_NAME}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/55">Blockchain</span>
              <span className="text-white">{BLOCKCHAIN}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/55">Decimals</span>
              <span className="text-white">{DECIMALS}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/55">Circulating Supply</span>
              <span className="text-white">{CIRC_SUPPLY}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/55">Launch Type</span>
              <span className="text-white">{LAUNCH_TYPE}</span>
            </div>

            <div className="pt-3">
              <div className="text-xs text-white/60 mb-2">Official Contract</div>
              <CopyRow label="Contract" value={CONTRACT} />
            </div>

            <div className="pt-3 grid grid-cols-1 gap-3">
              <NeonButton href={BUY_LINK} full>
              Dexscreener
              </NeonButton>
              <NeonButton href={PUMPFUN_LINK} variant="outline" full>
                Pump.fun
              </NeonButton>
            </div>
          </div>
        </div>

        {/* Supply Structure */}
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-neon-500/25 p-2 text-neon-300 shadow-neon">
              <Shield size={18} />
            </div>
            <h3 className="text-lg font-bold text-white">Supply Structure</h3>
          </div>

          <p className="mt-3 text-sm text-white/75 leading-relaxed">
            PFF follows a structured long-term framework with publicly verifiable locks.
            Burn milestones are predefined and tracked on-chain.
          </p>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-neon-500/15 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-white">🔒 11% Dev Holdings Locked (3 Years)</div>
                <a
                  href={DEV_LOCK_11_STREAMFLOW}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-neon-300 hover:underline"
                >
                  Verify on Streamflow <ExternalLink size={16} />
                </a>
              </div>
              <div className="mt-3">
                <CopyRow label="Wallet" value={DEV_LOCK_11_WALLET} />
              </div>
            </div>

            <div className="rounded-2xl border border-neon-500/15 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-white">🔒 2% Dev Holdings Locked (2 Years)</div>
                <a
                  href={DEV_LOCK_2_STREAMFLOW}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-neon-300 hover:underline"
                >
                  Verify on Streamflow <ExternalLink size={16} />
                </a>
              </div>
              <div className="mt-3">
                <CopyRow label="Wallet" value={DEV_LOCK_2_WALLET} />
              </div>
            </div>

            <div className="rounded-2xl border border-neon-500/15 bg-black/20 p-4">
              <div className="font-semibold text-white">🔥 5% Supply Earmarked for Burn at 1M MCAP</div>
              <div className="mt-3">
                <CopyRow label="Wallet" value={BURN_5_WALLET} />
              </div>
              <p className="mt-3 text-sm text-white/70">
                This structure ensures long-term alignment and milestone-based supply reduction.
              </p>
            </div>

            <div className="rounded-2xl border border-neon-500/15 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-neon-500/25 p-2 text-neon-300 shadow-neon">
                  <Flame size={18} />
                </div>
                <div className="font-semibold text-white">Treasury & Rewards Infrastructure</div>
              </div>

              <div className="mt-4 space-y-3">
                <CopyRow
                  label="Pump.fun Creator Fee Wallet (Rewards Distribution)"
                  value={CREATOR_FEE_WALLET}
                />
                <div className="text-sm text-white/75 leading-relaxed">
                  Used for:
                  <ul className="mt-2 space-y-1 text-white/70">
                    <li>• Community rewards</li>
                    <li>• Bagworker distributions</li>
                    <li>• Strategic buybacks</li>
                  </ul>
                </div>

                <CopyRow
                  label="Temporary Rewards / Marketing Wallet"
                  value={TEMP_REWARDS_WALLET}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowToBuy() {
  const buyOptions = [
    { src: "/assets/payment/pumpswap.png", link: PUMPSWAP_LINK, alt: "Pumpswap" },
    { src: "/assets/payment/jupiter.png", link: JUPITER_LINK, alt: "Jupiter" },
    { src: "/assets/payment/applepay.png", link: APPLEPAY_LINK, alt: "Apple Pay" },
    { src: "/assets/payment/visa.png", link: VISA_LINK, alt: "Visa / Mastercard" },
  ];

  const chartOptions = [
    { src: "/assets/payment/dexscrenner2.png", link: BUY_LINK, alt: "Dexscreener" },
    { src: "/assets/payment/dextools.svg", link: "https://www.dextools.io/app/token/pumpfunflokicto", alt: "Dextools" },
    { src: "/assets/payment/pumpfun.png", link: PUMPFUN_LINK, alt: "Pumpfun" },
    { src: "/assets/payment/coinmarketcap.png", link: "https://coinmarketcap.com/currencies/pumpfunfloki/", alt: "CoinMarketCap" },
  ];

  return (
    <section id="howtobuy" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <SectionTitle
        kicker="Guide"
        title="How to Buy"
        desc="Fast steps. Don’t overthink it. Verify links and contract."
      />

      {/* Top grid: Steps + Contract/Pro Tips */}
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {/* LEFT - Steps */}
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
              <span>Open the official chart / buy link (Dexscreener or Pump.fun).</span>
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

        {/* RIGHT - Contract + Tips */}
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

      {/* Bottom grid: How to Buy + PFF Charts */}
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {/* HOW TO BUY */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-xl border border-neon-500/25 p-2 text-neon-300 shadow-neon">
              <Rocket size={18} />
            </div>
            <h3 className="text-lg font-bold text-white">How to Buy</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {buyOptions.map((item) => (
              <a
                key={item.alt}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="group glass rounded-xl border border-neon-500/20 h-20
                           flex items-center justify-center
                           transition-all duration-300
                           hover:border-neon-500/70
                           hover:shadow-[0_0_40px_rgba(0,232,90,.25)]
                           hover:-translate-y-1"
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="max-h-8 md:max-h-10 object-contain opacity-80
                             group-hover:opacity-100 transition mix-blend-lighten"
                />
              </a>
            ))}
          </div>
        </div>

        {/* PFF CHARTS */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-xl border border-neon-500/25 p-2 text-neon-300 shadow-neon">
              <span className="text-base leading-none">📈</span>
            </div>
            <h3 className="text-lg font-bold text-white">PFF Charts</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {chartOptions.map((item) => (
              <a
                key={item.alt}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="group glass rounded-xl border border-neon-500/20 h-20
                           flex items-center justify-center
                           transition-all duration-300
                           hover:border-neon-500/70
                           hover:shadow-[0_0_40px_rgba(0,232,90,.25)]
                           hover:-translate-y-1"
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="max-h-8 md:max-h-10 object-contain opacity-80
                             group-hover:opacity-100 transition mix-blend-lighten"
                />
              </a>
            ))}
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
    "/assets/gallery/community5.png",
    "/assets/gallery/community6.png",
    "/assets/gallery/community7.png",
    "/assets/gallery/community8.png",
    "/assets/gallery/community9.jpg",
    "/assets/gallery/community10.jpg",
    "/assets/gallery/community21.jpg",
    "/assets/gallery/community12.jpg",
    "/assets/gallery/community23.jpg",
    "/assets/gallery/community14.jpg",
    "/assets/gallery/community15.jpg",
    "/assets/gallery/community16.jpg",
    "/assets/gallery/community17.jpg",
    "/assets/gallery/community18.jpg",
    "/assets/gallery/community19.jpg",
    "/assets/gallery/community20.jpg",
    "/assets/gallery/community11.jpg",
    "/assets/gallery/community22.jpg",
    "/assets/gallery/community13.jpg",
    "/assets/gallery/community24.jpg",
    "/assets/gallery/community25.jpg",
    "/assets/gallery/community26.jpg",
    "/assets/gallery/community27.jpg",
    "/assets/gallery/community28.jpg",
    "/assets/gallery/community29.jpg",
    "/assets/gallery/community30.jpg",
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

      <div className="relative mt-10">
        <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-bg to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-bg to-transparent z-10" />

        <div
          id="pff-gallery-track"
          className="flex gap-4 md:gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth
                   [-ms-overflow-style:none] [scrollbar-width:none]"
        >
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
      a: "A community-led meme token on Solana, reforged through community takeover. Built around culture, execution, and the OG FLOKI spirit — with transparent on-chain structure.",
    },
    {
      q: "Is the project secured against rugs?",
      a: "Dev supply is locked on Streamflow (verifiable on-chain). Burn milestones are predefined and tracked publicly. Treasury rails are transparent. No hidden allocations.",
    },
    {
      q: "Where can I buy $PFF?",
      a: "Use the official links only: Dexscreener, Pumpswap, or Jupiter. Always verify the contract address matches what's on this site before buying.",
    },
    {
      q: "How does the Quest / Swarm system work?",
      a: "Complete community quests (raids, art, lore), submit proof via this site. Approved submissions earn $PFF points and may receive direct SPL airdrops to your wallet.",
    },
    {
      q: "Is this financial advice?",
      a: "No. Meme coin culture — high risk, high volatility. Only use funds you can afford to lose entirely. Do your own research.",
    },
    {
      q: "How do I join the community?",
      a: "Follow on X (@PumpfunFlokiCTO), join the Telegram army, and follow TikTok for the latest raids and content.",
    },
  ];

  const [open, setOpen] = useState(null);

  return (
    <section id="faq" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <SectionTitle kicker="FAQ" title="Frequently Asked Questions" desc="Short answers. Clear vibes." />

      <div className="mt-10 space-y-2">
        {items.map((x, i) => (
          <div key={x.q} className="glass rounded-2xl overflow-hidden transition-all duration-200 hover:border-neon-500/30">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-bold text-white/90 text-sm leading-snug">{x.q}</span>
              <span
                className={`shrink-0 w-6 h-6 rounded-full border border-neon-500/30 bg-neon-500/[0.07] flex items-center justify-center text-neon-400 text-lg font-light transition-transform duration-200 ${
                  open === i ? "rotate-45 bg-neon-500/15" : ""
                }`}
              >
                +
              </span>
            </button>
            {open === i && (
              <div className="px-5 pb-5 text-sm text-white/65 leading-relaxed border-t border-neon-500/10 pt-4">
                {x.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const NAV = [
    ["Tokenomics", "/#tokenomics"],
    ["Roadmap", "/#roadmap"],
    ["How to Buy", "/#howtobuy"],
    ["Creations", "/#gallery"],
    ["Swarm", "/swarm"],
    ["🪖 Helmet", "/helmet"],
    ["FAQ", "/#faq"],
  ];
  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="relative mx-auto max-w-6xl">
        <nav className="glass-strong flex items-center justify-between rounded-2xl px-4 py-3 shadow-[0_0_40px_rgba(0,0,0,.6)]">
          <a href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight">
            <img src={LOGO_SRC} alt="Floki logo" className="h-9 w-9 rounded-xl object-contain drop-shadow-[0_0_16px_rgba(0,232,90,.40)]" />
            <div className="leading-none">
              <div className="flex items-center gap-1.5">
                <span className="text-white font-extrabold">PumpFun Floki</span>
                <span className="text-xs font-bold text-neon-400 bg-neon-500/10 border border-neon-500/30 rounded-md px-1.5 py-0.5">$PFF</span>
              </div>
              <div className="mt-0.5 text-[10px] text-white/40 tracking-wide">The Viking Returns</div>
            </div>
          </a>

          <div className="hidden md:flex items-center gap-1">
            {NAV.map(([label, href]) => (
              <a key={label} href={href} className="rounded-xl px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition">
                {label}
              </a>
            ))}
            <div className="ml-2">
              <NeonButton href="/#howtobuy" variant="solid">Buy $PFF</NeonButton>
            </div>
          </div>

          <button
            className="md:hidden inline-flex items-center justify-center rounded-xl border border-neon-500/25 bg-neon-500/[0.06] px-3 py-2 text-white/80 hover:text-white hover:bg-neon-500/12 transition"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>

        {mobileOpen && (
          <div className="md:hidden absolute left-0 right-0 mt-2 glass-strong rounded-2xl p-4 z-50 shadow-[0_20px_60px_rgba(0,0,0,.7)]">
            <div className="flex flex-col gap-1">
              {NAV.map(([label, href]) => (
                <a key={label} href={href} onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm text-white/75 hover:text-white hover:bg-white/[0.06] transition"
                >
                  {label}
                </a>
              ))}
              <div className="pt-2 border-t border-neon-500/10 mt-1">
                <NeonButton href="/#howtobuy" full>⚡ Buy $PFF</NeonButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function SwarmPage() {
  return (
    <div className="min-h-screen bg-[#05070A]">
      <SiteHeader />
      <PFFSwarmOracleHub contract={CONTRACT} />
    </div>
  );
}

function HelmetPage() {
  return (
    <div className="bg-[#05070A]">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-12">
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-400 shadow-neon" />
            <span className="text-xs font-extrabold tracking-widest uppercase text-neon-400">PFF Community Tool</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white text-glow drop-shadow-[0_0_18px_rgba(0,232,90,.25)]">
            🪖 Viking Helmet Generator
          </h1>
          <p className="mt-2 text-white/60 text-sm max-w-lg">
            Upload your photo and join the Horde — the PFF Viking helmet is yours to wear. Share your result on X with <span className="text-neon-400">#PFF</span>.
          </p>
        </div>

        {/* iframe — tall enough so the outer page scrolls, no inner scroll */}
        <div className="rounded-2xl overflow-hidden border border-neon-500/20 shadow-[0_0_40px_rgba(0,232,90,.07)]">
          <iframe
            src="https://pumpfunfloki-helmet.vercel.app/"
            title="PFF Viking Helmet Generator"
            className="w-full"
            style={{ border: "none", background: "#05070A", height: "1200px", overflow: "hidden" }}
            allow="camera"
          />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdminRoute = window.location.pathname === "/valhalla-admin";
  if (isAdminRoute) return <ValhallaAdmin />;
  const isSwarmRoute = window.location.pathname === "/swarm";
  if (isSwarmRoute) return <SwarmPage />;
  const isHelmetRoute = window.location.pathname === "/helmet";
  if (isHelmetRoute) return <HelmetPage />;

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
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/assets/hero.jpg')] bg-cover bg-center opacity-55 pointer-events-none" aria-hidden />
        <div className="absolute inset-0 bg-noise pointer-events-none" aria-hidden />
        <div className="absolute inset-0 bg-grid [background-size:64px_64px] opacity-25 pointer-events-none" aria-hidden />
        <div className="absolute inset-0 grain pointer-events-none" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-bg/70 to-bg pointer-events-none" aria-hidden />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 px-4 pt-4">
        <div className="relative mx-auto max-w-6xl">
          <nav className="glass-strong flex items-center justify-between rounded-2xl px-4 py-3 shadow-[0_0_40px_rgba(0,0,0,.6)]">
            <a href="#" className="flex items-center gap-2.5 font-extrabold tracking-tight">
              <img
                src={LOGO_SRC}
                alt="Floki logo"
                className="h-9 w-9 rounded-xl object-contain drop-shadow-[0_0_16px_rgba(0,232,90,.40)]"
              />
              <div className="leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-extrabold">PumpFun Floki</span>
                  <span className="text-xs font-bold text-neon-400 bg-neon-500/10 border border-neon-500/30 rounded-md px-1.5 py-0.5">$PFF</span>
                </div>
                <div className="mt-0.5 text-[10px] text-white/40 tracking-wide">The Viking Returns</div>
              </div>
            </a>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-1">
              {[
                ["Tokenomics", "#tokenomics"],
                ["Roadmap", "#roadmap"],
                ["How to Buy", "#howtobuy"],
                ["Creations", "#gallery"],
                ["FAQ", "#faq"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="rounded-xl px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition"
                >
                  {label}
                </a>
              ))}
              <a
                href="/helmet"
                className="ml-1 rounded-xl px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition"
              >
                🪖 Helmet
              </a>
              <a
                href="/swarm"
                className="ml-1 inline-flex items-center gap-1.5 rounded-xl border border-neon-500/40 bg-neon-500/[0.08] px-3 py-1.5 text-sm font-semibold text-neon-400 hover:bg-neon-500/15 hover:border-neon-500/70 hover:text-neon-300 transition shadow-[0_0_12px_rgba(0,232,90,.12)]"
              >
                ⚔️ The Swarm
              </a>
              <div className="ml-2">
                <NeonButton href={BUY_LINK} variant="solid">
                  Buy $PFF
                </NeonButton>
              </div>
            </div>

            {/* Mobile burger */}
            <button
              className="md:hidden inline-flex items-center justify-center rounded-xl border border-neon-500/25 bg-neon-500/[0.06] px-3 py-2 text-white/80 hover:text-white hover:bg-neon-500/12 transition"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </nav>

          {/* Mobile dropdown */}
          {mobileOpen && (
            <div className="md:hidden absolute left-0 right-0 mt-2 glass-strong rounded-2xl p-4 z-50 shadow-[0_20px_60px_rgba(0,0,0,.7)]">
              <div className="flex flex-col gap-1">
                {[
                  ["Tokenomics", "#tokenomics"],
                  ["Roadmap", "#roadmap"],
                  ["How to Buy", "#howtobuy"],
                  ["Creations", "#gallery"],
                  ["FAQ", "#faq"],
                ].map(([label, href]) => (
                  <a
                    key={label}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-sm text-white/75 hover:text-white hover:bg-white/[0.06] transition"
                    href={href}
                  >
                    {label}
                  </a>
                ))}
                <a
                  href="/helmet"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm text-white/75 hover:text-white hover:bg-white/[0.06] transition"
                >
                  🪖 Helmet
                </a>
                <a
                  href="/swarm"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-neon-400 border border-neon-500/30 bg-neon-500/[0.06] hover:bg-neon-500/12 hover:border-neon-500/55 transition"
                >
                  ⚔️ The Swarm
                </a>
                <div className="pt-2 border-t border-neon-500/10 mt-1">
                  <NeonButton href={BUY_LINK} full>
                    ⚡ Buy $PFF
                  </NeonButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
<section className="relative mx-auto max-w-6xl px-4 pt-12 md:pt-14 pb-10 md:pb-12">
  {/* Ambient glow orbs */}
  <div className="pointer-events-none absolute -top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-neon-500/[0.04] blur-[120px]" />
  <div className="pointer-events-none absolute top-10 right-0 w-[400px] h-[400px] rounded-full bg-neon-500/[0.06] blur-[100px]" />

  <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
    {/* LEFT */}
    <div>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
          The Viking Returns.
          <span className="block text-neon-400 text-glow">On Pump For Fun</span>
        </h1>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-5 text-white/85 max-w-lg leading-relaxed text-[15px]"
      >
        $PFF is PumpFun Floki — a new era of meme coin forged in the wild lands of PumpFun. Inspired by the OG meme FLOKI, the spirit of the Viking lives on: mischievous, fearless, and ready to raid the timeline. Backed by the most powerful meme culture in crypto history, $PFF is not just a coin — it's a movement.
      </motion.p>

      {/* MOBILE MASCOT */}
      <div className="mt-6 lg:hidden">
        <img
          src="/assets/community9.png"
          alt="PumpFun Floki mascot"
          className="w-full max-w-[320px] mx-auto object-contain drop-shadow-[0_0_40px_rgba(0,232,90,.30)]"
        />
      </div>

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-7 flex flex-col sm:flex-row gap-3 max-w-lg"
      >
        <NeonButton href="#howtobuy" full className="btn-cta text-base py-4 font-extrabold">
          ⚡ Buy $PFF Now
        </NeonButton>
        <NeonButton href={PUMPFUN_LINK} variant="outline" full className="text-base py-4">
          Pump.fun
        </NeonButton>
      </motion.div>

      {/* Social quick links */}
      <div className="mt-4 flex items-center gap-3">
        <a href={X_LINK} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 hover:border-white/25 hover:text-white/90 transition">
          <img src="/assets/footer/X.png" alt="X" className="w-3.5 h-3.5 object-contain" />
          Twitter / X
        </a>
        <a href={TG_LINK} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 hover:border-white/25 hover:text-white/90 transition">
          <img src="/assets/footer/telegram.png" alt="TG" className="w-3.5 h-3.5 object-contain" />
          Telegram
        </a>
        <a href={TIKTOK_LINK} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 hover:border-white/25 hover:text-white/90 transition">
          <img src="/assets/footer/tiktok.png" alt="TikTok" className="w-3.5 h-3.5 object-contain" />
          TikTok
        </a>
      </div>

      {/* Narrative / Mission */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-neon-500/15 bg-gradient-to-br from-neon-500/[0.06] to-transparent p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-neon-400 text-base">⚔️</span>
            <div className="text-xs font-bold tracking-widest uppercase text-neon-400">Narrative</div>
          </div>
          <div className="text-sm text-white/75 leading-relaxed">
            Born from OG Floki’s spirit and reforged through community takeover. Evolution isn’t optional — it’s the edge.
          </div>
        </div>

        <div className="rounded-2xl border border-neon-500/15 bg-gradient-to-br from-neon-500/[0.06] to-transparent p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-neon-400 text-base">🛡️</span>
            <div className="text-xs font-bold tracking-widest uppercase text-neon-400">Mission</div>
          </div>
          <div className="text-sm text-white/75 leading-relaxed">
            Prove a community coin can outlast rugs, outwork noise, and march toward Valhalla.
          </div>
        </div>
      </div>

      <div className="mt-5">
        <ContractCard />
      </div>
    </div>

    {/* RIGHT MASCOT (desktop only) */}
    <div className="relative mx-auto max-w-[520px] lg:max-w-none hidden lg:flex items-center justify-center">
      {/* Glow behind mascot */}
      <div
        className="absolute inset-0 -z-10 blur-3xl opacity-50 rounded-full"
        style={{ background: "radial-gradient(circle at 50% 55%, rgba(0,232,90,.22) 0%, transparent 70%)" }}
      />
      <img
        src="/assets/community9.png"
        alt="PumpFun Floki mascot"
        className="w-full object-contain drop-shadow-[0_0_50px_rgba(0,232,90,.30)]"
      />
    </div>
  </div>
</section>


      {/* About / Value props (UPDATED 3 CARDS) */}
      <section id="about" className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-5 md:grid-cols-3">
          <Card title="Community First" icon={<Users size={18} />}>
            PFF is powered by holders, not insiders. After the rug, the community CTO’d the project and rebuilt it with conviction.
            Every milestone and expansion is driven by collective execution — not hidden agendas.
          </Card>

          <Card title="Unruggable by Design" icon={<Shield size={18} />}>
            Dev supply is locked with long-term structure. Burn milestones are predefined and buybacks are executed with intent.
            Liquidity will be progressively thickened and expanded to improve stability and reduce fragility. The foundation is built for durability.
          </Card>

          <Card title="Forever Forward" icon={<Rocket size={18} />}>
            Execution is constant — meme cycles, daily engagement, roadmap progression, and strategic expansion.
            No stagnation. No fade. Momentum is permanent.
          </Card>
        </div>
      </section>

      <PhotoSliderOnly />

      {/* Tokenomics Full */}
      <Tokenomics />

      <VideoBanner />

      {/* Roadmap Full */}
      <Roadmap />

      <TokenBanner />

      <HowToBuy />
      


      <CommunityGallery />

      <FAQ />

      {/* Swarm CTA Section */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="relative overflow-hidden rounded-3xl border border-neon-500/25 bg-gradient-to-br from-neon-500/[0.07] via-black/40 to-black/60 p-8 md:p-12 text-center shadow-[0_0_60px_rgba(0,232,90,.08)]">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-64 w-64 rounded-full bg-neon-500/10 blur-[80px]" />
          </div>
          {/* Top line */}
          <div className="h-px w-full absolute top-0 left-0 bg-gradient-to-r from-transparent via-neon-500/50 to-transparent" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-400 shadow-neon" />
              <span className="text-xs font-extrabold tracking-widest uppercase text-neon-400">PFF Community Hub</span>
              <span className="h-1.5 w-1.5 rounded-full bg-neon-400 shadow-neon" />
            </div>

            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white text-glow drop-shadow-[0_0_18px_rgba(0,232,90,.25)]">
              Join the Horde.<br />
              <span className="text-neon-400">Earn your Valhalla.</span>
            </h2>

            <p className="mt-4 text-white/70 max-w-xl mx-auto text-base leading-relaxed">
              The Swarm is the $PFF community hub — complete quests, climb the leaderboard, earn your Viking rank, and share your PFF Passport.
            </p>

            {/* Feature pills */}
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {[
                ["⚔️", "Quests & Rewards"],
                ["🏆", "Leaderboard"],
                ["🏛️", "Hall of Fame"],
                ["🪖", "Viking Ranks"],
                ["🪪", "PFF Passport"],
              ].map(([icon, label]) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-2 rounded-xl border border-neon-500/20 bg-neon-500/[0.06] px-4 py-2 text-sm text-white/80 font-medium"
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <div className="mt-9">
              <a
                href="/swarm"
                className="inline-flex items-center gap-2.5 rounded-2xl bg-neon-500 px-8 py-4 text-base font-extrabold text-black shadow-neonStrong hover:bg-neon-400 hover:translate-y-[-2px] active:translate-y-0 transition will-change-transform"
              >
                ⚔️ Enter the Swarm
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative mx-auto max-w-6xl px-4 pb-14 mt-8">
        {/* Top separator */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-neon-500/25 to-transparent mb-10" />

        <div className="glass rounded-2xl overflow-hidden">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-neon-500/50 to-transparent" />
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Left — brand + tagline */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <img src={LOGO_SRC} alt="logo" className="w-7 h-7 rounded-full object-contain" />
                  <span className="font-extrabold text-white">PumpFun Floki</span>
                  <span className="text-xs text-neon-400 font-bold">$PFF</span>
                </div>
                <p className="text-sm text-white/50 max-w-xs">
                  March toward Valhalla. Community-led, on-chain, unstoppable.
                </p>
                <a className="mt-2 inline-block text-xs text-neon-300/70 hover:text-neon-300 transition" href={`mailto:${EMAIL}`}>
                  {EMAIL}
                </a>
              </div>

              {/* Right — social icons */}
              <div className="flex items-center gap-4">
                {[
                  { src: "/assets/footer/X.png", link: X_LINK, alt: "X" },
                  { src: "/assets/footer/telegram.png", link: TG_LINK, alt: "Telegram" },
                  { src: "/assets/footer/tiktok.png", link: TIKTOK_LINK, alt: "TikTok" },
                ].map((item) => (
                  <a
                    key={item.alt}
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative w-12 h-12 rounded-2xl
                               border border-neon-500/25 bg-neon-500/[0.05]
                               flex items-center justify-center
                               transition-all duration-300
                               hover:border-neon-500/70 hover:bg-neon-500/15
                               hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(0,232,90,.35)]"
                  >
                    <img
                      src={item.src}
                      alt={item.alt}
                      className="w-5 h-5 object-contain opacity-70 group-hover:opacity-100 transition"
                    />
                  </a>
                ))}
              </div>
            </div>

            {/* Bottom row */}
            <div className="mt-6 pt-5 border-t border-neon-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <p className="text-xs text-white/35">
                Disclaimer: meme coin. NFA. High risk. Verify links and contract. — PumpFunFloki
              </p>
              <p className="text-xs text-white/25">© 2025 PumpFunFloki. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
