function LogoWrapper({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="merchant-logo"
      viewBox="0 0 120 28"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

export const LOGOS: Record<string, React.ReactNode> = {
  "batik-premium": (
    <LogoWrapper>
      <text
        x="60"
        y="18"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="13"
        letterSpacing="2.2"
        fill="currentColor"
      >
        BATIK·PREMIUM
      </text>
    </LogoWrapper>
  ),

  wardrobe: (
    <LogoWrapper>
      <text
        x="56"
        y="19"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="300"
        fontSize="15"
        fill="currentColor"
      >
        wardrobe
      </text>
      <circle cx="105" cy="15" r="3" fill="#ef4444" />
    </LogoWrapper>
  ),

  ethnica: (
    <LogoWrapper>
      <path d="M8 14 L12 8 L16 14 L12 20 Z" fill="currentColor" />
      <text
        x="60"
        y="19"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        fontSize="12"
        letterSpacing="3"
        fill="currentColor"
      >
        ETHNICA
      </text>
    </LogoWrapper>
  ),

  "studio-daun": (
    <LogoWrapper>
      <path
        d="M8 20 C8 12 14 8 14 8 C14 8 20 12 20 20"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <text
        x="65"
        y="19"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontSize="14"
        fill="currentColor"
      >
        <tspan fontWeight="300">Studio</tspan>
        <tspan fontWeight="800">·Daun</tspan>
      </text>
    </LogoWrapper>
  ),

  "rumah-tenun": (
    <LogoWrapper>
      <text
        x="60"
        y="12"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="500"
        fontSize="9"
        letterSpacing="3.5"
        fill="currentColor"
      >
        RUMAH
      </text>
      <text
        x="60"
        y="24"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="900"
        fontSize="16"
        letterSpacing="1.5"
        fill="currentColor"
      >
        TENUN
      </text>
    </LogoWrapper>
  ),

  "hijab-id": (
    <LogoWrapper>
      <path
        d="M44 6 C44 3 47 1 50 1 C53 1 56 3 56 6"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <text
        x="60"
        y="20"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="500"
        fontSize="15"
        fill="currentColor"
      >
        hijab.id
      </text>
    </LogoWrapper>
  ),

  "the-edit": (
    <LogoWrapper>
      <text
        x="60"
        y="11"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="300"
        fontSize="9"
        letterSpacing="2.5"
        fill="currentColor"
      >
        The
      </text>
      <text
        x="60"
        y="24"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="800"
        fontSize="17"
        fill="currentColor"
      >
        Edit™
      </text>
    </LogoWrapper>
  ),

  "kain-co": (
    <LogoWrapper>
      <text
        x="50"
        y="15"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="900"
        fontSize="17"
        letterSpacing="2"
        fill="currentColor"
      >
        KAIN
      </text>
      <line
        x1="16"
        y1="19"
        x2="84"
        y2="19"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <text
        x="60"
        y="27"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="400"
        fontSize="11"
        fill="currentColor"
      >
        Co.
      </text>
    </LogoWrapper>
  ),

  modisku: (
    <LogoWrapper>
      <text
        x="60"
        y="19"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="600"
        fontSize="16"
        letterSpacing="-0.4"
        fill="currentColor"
      >
        modisku
      </text>
    </LogoWrapper>
  ),

  lokal: (
    <LogoWrapper>
      <text
        x="60"
        y="19"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        fontSize="13"
        letterSpacing="3"
        fill="currentColor"
      >
        ∞ LOKAL
      </text>
    </LogoWrapper>
  ),
};
