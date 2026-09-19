// StageX AI — Visual Artwork & Event Poster Synthesis Engine
// Generates high-resolution visual compositions for Global Copilot & Invitations

export interface ArtworkParams {
  title?: string;
  subtitle?: string;
  prompt?: string;
  theme?: string;
  eventType?: string;
  organizer?: string;
  venue?: string;
  dateText?: string;
  aspectRatio?: "poster" | "square" | "landscape";
}

export function generateEventArtworkSVG(params: ArtworkParams): string {
  const {
    title = "StageX Live Event",
    subtitle = "An Exceptional Live Experience",
    prompt = "Cinematic Stage Atmosphere",
    theme = "modern_dark",
    eventType = "Exclusive Event",
    organizer = "Stage Operations",
    venue = "",
    dateText = "",
    aspectRatio = "poster",
  } = params;

  let width = 1080;
  let height = 1350; // 4:5 portrait poster

  if (aspectRatio === "square") {
    width = 1080;
    height = 1080;
  } else if (aspectRatio === "landscape") {
    width = 1200;
    height = 630;
  }

  const palettes: Record<string, { bg1: string; bg2: string; accent: string; glow: string; text: string; badge: string; gold?: string }> = {
    modern_dark: { bg1: "#070B14", bg2: "#0F172A", accent: "#3B82F6", glow: "#60A5FA", text: "#F8FAFC", badge: "#1E293B" },
    executive_gold: { bg1: "#0F0B05", bg2: "#1C140A", accent: "#D97706", glow: "#FBBF24", text: "#FEF3C7", badge: "#291E0A", gold: "#F59E0B" },
    neon_tech: { bg1: "#050714", bg2: "#0A0E2E", accent: "#06B6D4", glow: "#818CF8", text: "#E0F2FE", badge: "#131C4A" },
    clean_minimal: { bg1: "#0F172A", bg2: "#1E293B", accent: "#10B981", glow: "#34D399", text: "#F1F5F9", badge: "#334155" },
    cultural_warm: { bg1: "#1A0A10", bg2: "#2D0F1E", accent: "#EC4899", glow: "#F43F5E", text: "#FFE4E6", badge: "#4A122E" },
    luxury_gala: { bg1: "#0B0714", bg2: "#180E2B", accent: "#A855F7", glow: "#C084FC", text: "#FAF5FF", badge: "#261742" },
  };

  const pal = palettes[theme] || palettes.modern_dark;

  // Generate SVG with stage lighting, glows, geometric accents
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <radialGradient id="bgGlow" cx="50%" cy="30%" r="65%">
        <stop offset="0%" stop-color="${pal.glow}" stop-opacity="0.35"/>
        <stop offset="50%" stop-color="${pal.accent}" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="${pal.bg1}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${pal.bg2}"/>
        <stop offset="100%" stop-color="${pal.bg1}"/>
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${pal.accent}"/>
        <stop offset="100%" stop-color="${pal.glow}"/>
      </linearGradient>
      <filter id="blurGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="45" result="blur" />
      </filter>
    </defs>

    <!-- Background Base -->
    <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
    <rect width="${width}" height="${height}" fill="url(#bgGlow)"/>

    <!-- Ambient Glowing Stage Orbs -->
    <circle cx="${width * 0.2}" cy="${height * 0.22}" r="${width * 0.2}" fill="${pal.accent}" opacity="0.22" filter="url(#blurGlow)"/>
    <circle cx="${width * 0.8}" cy="${height * 0.3}" r="${width * 0.24}" fill="${pal.glow}" opacity="0.18" filter="url(#blurGlow)"/>
    <circle cx="${width * 0.5}" cy="${height * 0.6}" r="${width * 0.3}" fill="${pal.accent}" opacity="0.12" filter="url(#blurGlow)"/>

    <!-- Stage Spotlight Beams -->
    <polygon points="${width * 0.1},-50 ${width * 0.35},${height * 0.75} ${width * 0.15},${height * 0.75}" fill="${pal.glow}" opacity="0.07" />
    <polygon points="${width * 0.9},-50 ${width * 0.65},${height * 0.75} ${width * 0.85},${height * 0.75}" fill="${pal.accent}" opacity="0.07" />

    <!-- Technical Boundary Lines -->
    <g stroke="${pal.text}" stroke-opacity="0.07" stroke-width="1.5">
      <line x1="80" y1="0" x2="80" y2="${height}"/>
      <line x1="${width - 80}" y1="0" x2="${width - 80}" y2="${height}"/>
      <line x1="0" y1="100" x2="${width}" y2="100"/>
      <line x1="0" y1="${height - 100}" x2="${width}" y2="${height - 100}"/>
    </g>

    <!-- Sleek Corner Geometry -->
    <path d="M 80 160 L 80 100 L 140 100" fill="none" stroke="${pal.accent}" stroke-width="3"/>
    <path d="M ${width - 80} 160 L ${width - 80} 100 L ${width - 140} 100" fill="none" stroke="${pal.accent}" stroke-width="3"/>
    <path d="M 80 ${height - 160} L 80 ${height - 100} L 140 ${height - 100}" fill="none" stroke="${pal.accent}" stroke-width="3"/>
    <path d="M ${width - 80} ${height - 160} L ${width - 80} ${height - 100} L ${width - 140} ${height - 100}" fill="none" stroke="${pal.accent}" stroke-width="3"/>

    <!-- Brand Header -->
    <text x="${width / 2}" y="70" text-anchor="middle" fill="${pal.text}" fill-opacity="0.5" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" letter-spacing="6">STAGEX AI • LIVE OPERATIONS</text>

    <!-- Event Category Badge -->
    <rect x="${width / 2 - 160}" y="${height * 0.16}" width="320" height="42" rx="21" fill="${pal.badge}" stroke="${pal.accent}" stroke-width="1.5" stroke-opacity="0.6"/>
    <text x="${width / 2}" y="${height * 0.16 + 27}" text-anchor="middle" fill="${pal.glow}" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" letter-spacing="3">${(eventType || "EXCLUSIVE EVENT").toUpperCase()}</text>

    <!-- Main Title -->
    <text x="${width / 2}" y="${height * 0.28}" text-anchor="middle" fill="${pal.text}" font-family="system-ui, -apple-system, sans-serif" font-size="${height > 1000 ? 56 : 42}" font-weight="900" letter-spacing="-1">${escapeXml(title)}</text>

    <!-- Prompt / Theme Subtitle -->
    <text x="${width / 2}" y="${height * 0.33}" text-anchor="middle" fill="${pal.glow}" font-family="system-ui, -apple-system, sans-serif" font-size="${height > 1000 ? 22 : 18}" font-weight="500" letter-spacing="1">${escapeXml(subtitle || prompt)}</text>

    <!-- Central Visual Focal Point -->
    <g transform="translate(${width / 2}, ${height * 0.55})">
      <circle cx="0" cy="0" r="${width * 0.18}" fill="none" stroke="url(#accentGrad)" stroke-width="3.5" stroke-dasharray="14 7"/>
      <circle cx="0" cy="0" r="${width * 0.14}" fill="${pal.bg2}" stroke="${pal.glow}" stroke-width="1.5" stroke-opacity="0.5"/>
      <polygon points="0,-${width * 0.1} ${width * 0.09},${width * 0.06} -${width * 0.09},${width * 0.06}" fill="none" stroke="${pal.accent}" stroke-width="2" stroke-opacity="0.4"/>
      <polygon points="0,${width * 0.1} -${width * 0.09},-${width * 0.06} ${width * 0.09},-${width * 0.06}" fill="none" stroke="${pal.glow}" stroke-width="2" stroke-opacity="0.4"/>
      <circle cx="0" cy="0" r="22" fill="url(#accentGrad)"/>
    </g>

    <!-- Venue & Date Details if provided -->
    ${venue || dateText ? `
      <g transform="translate(${width / 2}, ${height * 0.78})">
        <rect x="-240" y="-30" width="480" height="60" rx="12" fill="${pal.badge}" stroke="${pal.accent}" stroke-width="1" stroke-opacity="0.4"/>
        <text x="0" y="8" text-anchor="middle" fill="${pal.text}" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" letter-spacing="1">${escapeXml([dateText, venue].filter(Boolean).join(" • "))}</text>
      </g>
    ` : ""}

    <!-- Dynamic Graphic Accent Wave -->
    <path d="M 80 ${height * 0.88} Q ${width * 0.3} ${height * 0.85} ${width * 0.5} ${height * 0.88} T ${width - 80} ${height * 0.88}" fill="none" stroke="${pal.accent}" stroke-width="2" stroke-opacity="0.3"/>
    <path d="M 80 ${height * 0.90} Q ${width * 0.3} ${height * 0.87} ${width * 0.5} ${height * 0.90} T ${width - 80} ${height * 0.90}" fill="none" stroke="${pal.glow}" stroke-width="1.5" stroke-opacity="0.2"/>

    <!-- Footer Branding -->
    <text x="${width / 2}" y="${height - 50}" text-anchor="middle" fill="${pal.text}" fill-opacity="0.6" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" letter-spacing="3">${escapeXml((organizer ? `ORGANIZED BY ${organizer.toUpperCase()} • ` : "") + "POWERED BY STAGEX AI")}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
