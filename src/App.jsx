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

function NeonButton({ href, children, variant = "solid", full = false }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition will-change-transform";
  const solid =
    "bg-neon-500 text-black shadow-neonStrong hover:translate-y-[-1px] hover:bg-neon-400";
  const outline =
    "border border-neon-500/40 text-white shadow-neon hover:translate-y-[-1px] hover:border-neon-500/70";

  const isExternal = href?.startsWith("http");

  return (
    <a
      href={href}
      className={`${base} ${variant === "solid" ? solid : outline} ${
        full ? "w-full" : ""
      }`}
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
            <span className="text-sm font-extrabold tracking-widest uppercase text-neon-400 text-glow drop-shadow-[0_0_14px_rgba(0,232,90,.45)]">
              {kicker}
            </span>
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
        {roadmap.map((p) => (
          <div key={p.title} className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-white">{p.title}</h3>
              <span className="rounded-full border border-neon-500/25 px-3 py-1 text-xs text-neon-300">
                {p.range}
              </span>
            </div>

            {/* Targets / Focus */}
            <div className="mt-4 space-y-2 text-sm text-white/75">
              <div className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-neon-500 shadow-neon" />
                <span>
                  <span className="text-white/85 font-semibold">Targets:</span>{" "}
                  {p.meta?.targets}
                </span>
              </div>

              <div className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-neon-500 shadow-neon" />
                <span>
                  <span className="text-white/85 font-semibold">Focus:</span>{" "}
                  {p.meta?.focus}
                </span>
              </div>
            </div>

            {/* Section groups with sub-bullets */}
            <div className="mt-5 space-y-4 text-sm text-white/75">
              {(p.sections || []).map((sec) => (
                <div key={sec.label}>
                  <div className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-neon-500 shadow-neon" />
                    <span className="text-white/85 font-semibold">{sec.label}</span>
                  </div>

                  <ul className="mt-2 ml-5 space-y-2">
                    {(sec.items || []).map((it) => (
                      <li key={it} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/50" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
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
      a: "A community-led meme token on Solana, reforged through takeover and built around culture + execution.",
    },
    {
      q: "Is the project secured against rugs?",
      a: "Dev supply is locked with verifiable contracts, burn milestones are defined, and treasury rails are transparent.",
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
      <SectionTitle kicker="FAQ" title="Frequently Asked Questions" desc="Short answers. Clear vibes." />

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
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-bg/70 to-bg" aria-hidden />
      </div>

      {/* Nav */}
      <header className="relative mx-auto max-w-6xl px-4 pt-6">
        <div className="relative">
          <nav className="glass flex items-center justify-between rounded-2xl px-4 py-3">
            <a href="#" className="flex items-center gap-3 font-extrabold tracking-tight">
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
                <div className="mt-1 text-[11px] text-white/55">The Viking Returns</div>
              </div>
            </a>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-4">
              <a className="text-sm text-white/70 hover:text-white" href="#tokenomics">
                Tokenomics
              </a>
              <a className="text-sm text-white/70 hover:text-white" href="#roadmap">
                Roadmap
              </a>
              <a className="text-sm text-white/70 hover:text-white" href="#howtobuy">
                How to Buy
              </a>
              <a className="text-sm text-white/70 hover:text-white" href="#gallery">
                Creations
              </a>
              <a className="text-sm text-white/70 hover:text-white" href="#faq">
                FAQ
              </a>
              <NeonButton href="#howtobuy" variant="outline">
  How to Buy
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
                <a onClick={() => setMobileOpen(false)} className="text-sm text-white/80 hover:text-white" href="#tokenomics">
                  Tokenomics
                </a>
                <a onClick={() => setMobileOpen(false)} className="text-sm text-white/80 hover:text-white" href="#roadmap">
                  Roadmap
                </a>
                <a onClick={() => setMobileOpen(false)} className="text-sm text-white/80 hover:text-white" href="#howtobuy">
                  How to Buy
                </a>
                <a onClick={() => setMobileOpen(false)} className="text-sm text-white/80 hover:text-white" href="#gallery">
                  Creations
                </a>
                <a onClick={() => setMobileOpen(false)} className="text-sm text-white/80 hover:text-white" href="#faq">
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
      {/* Hero */}
<section className="relative mx-auto max-w-6xl px-4 pt-12 md:pt-14 pb-10 md:pb-12">
  <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
    {/* LEFT */}
    <div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-glow text-white"
      >
        The Viking Returns.
        <span className="block text-white/80">On Pump For Fun</span>
      </motion.h1>

      <p className="mt-4 text-white/70 max-w-xl leading-relaxed">
        $PFF is PumpFun Floki — a new era of meme coin forged in the wild lands of PumpFun.
        Inspired by the OG meme FLOKI, the spirit of the Viking lives on: mischievous, fearless,
        and ready to raid the timeline. Backed by the most powerful meme culture in crypto history,
        $PFF is not just a coin — it’s a movement.
      </p>

      {/* MOBILE MASCOT (between text and CTA) */}
      <div className="mt-6 lg:hidden">
        <img
          src="/assets/community9.png"
          alt="PumpFun Floki mascot"
          className="w-full max-w-[360px] mx-auto object-contain drop-shadow-[0_0_35px_rgba(0,232,90,.25)]"
        />
        <div
          className="pointer-events-none mx-auto mt-0 max-w-[360px] rounded-[2rem] blur-2xl opacity-60"
          style={{ boxShadow: "0 0 220px rgba(0,232,90,.20)" }}
        />
      </div>

      {/* CTA */}
      <div className="mt-6 w-full max-w-xl">
        <NeonButton href="#howtobuy" full>
          Buy $PFF
        </NeonButton>
      </div>

      {/* Narrative / Mission */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="glass rounded-2xl p-4">
          <div className="text-xs text-white/60">Narrative</div>
          <div className="mt-1 font-semibold text-neon-300 text-glow">
            Born from OG Floki’s spirit and reforged through community takeover, PFF evolves the narrative for the Pump.fun creator era.
            As meme culture, art tech, and Gen-AI reshape the arena, evolution isn’t optional — it’s the edge. Faster, sharper, built to endure.
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="text-xs text-white/60">Mission</div>
          <div className="mt-1 font-semibold text-neon-300 text-glow">
            To prove that a community-driven meme coin can outlast rugs, outwork noise, and build lasting structure.
            Powered by next-level art, a battle-tested community, transparent locks, liquidity thickening, and disciplined execution,
            PFF marches toward Valhalla.
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ContractCard />
      </div>
    </div>

    {/* RIGHT MASCOT (desktop only) */}
    <div className="relative mx-auto max-w-[520px] lg:max-w-none hidden lg:block">
      <img
        src="/assets/community9.png"
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

      {/* Footer */}
      <footer className="relative mx-auto max-w-6xl px-4 pb-14">
        <div className="glass rounded-2xl p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-bold text-white">Join the raid</div>
            <div className="text-sm text-white/70">
              X • Telegram • Email:{" "}
              <a className="text-neon-300 hover:underline" href={`mailto:${EMAIL}`}>
                {EMAIL}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-5">

  {[
    { src: "/assets/footer/X.png", link: X_LINK, alt: "X" },
    { src: "/assets/footer/telegram.png", link: TG_LINK, alt: "Telegram" },
    { src: "/assets/footer/tiktok.png", link: "https://tiktok.com/@pumpfun.floki.off", alt: "TikTok" },
    { src: "/assets/footer/X.png", link: "https://x.com/i/communities", alt: "X Community" },
  ].map((item) => (
    <a
      key={item.alt}
      href={item.link}
      target="_blank"
      rel="noreferrer"
      className="group relative w-16 h-16 rounded-full
                 border border-neon-500/40
                 bg-gradient-to-br from-black via-black/80 to-black/60
                 flex items-center justify-center
                 transition-all duration-300
                 hover:border-neon-500
                 hover:shadow-[0_0_40px_rgba(0,232,90,.45)]
                 hover:-translate-y-2"
    >
      {/* Glow ring */}
      <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100
                      shadow-[0_0_60px_rgba(0,232,90,.35)]
                      transition duration-300" />

      <img
        src={item.src}
        alt={item.alt}
        className="relative w-8 h-8 object-contain opacity-90
                   group-hover:scale-110
                   group-hover:opacity-100
                   transition duration-300"
      />
    </a>
  ))}

</div>



        </div>

        <div className="mt-6 text-xs text-white/45">
          Disclaimer: meme coin. NFA. High risk. Verify links and contract. — PumpFunFloki
        </div>
      </footer>
    </main>
  );
}
