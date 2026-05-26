import { useNavigate } from "react-router-dom";
import "./marketing.css";

/* ── Tiny inline SVG components ─────────────────────────────────────────── */

const SkyeCloud = ({ width = 32, color = "currentColor", style }) => (
  <svg
    width={width}
    height={Math.round(width * 0.72)}
    viewBox="0 0 100 72"
    fill={color}
    style={{ display: "inline-block", verticalAlign: "middle", ...style }}
    aria-hidden="true"
  >
    <circle cx="20" cy="52" r="14" />
    <circle cx="40" cy="42" r="16" />
    <circle cx="62" cy="32" r="18" />
    <circle cx="82" cy="30" r="14" />
  </svg>
);

const Icon = ({ name, ...props }) => {
  const icons = {
    store: (
      <>
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <path d="M2 7h20" />
      </>
    ),
    sparkles: (
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    ),
    truck: (
      <>
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
        <circle cx="17" cy="18" r="2" />
        <circle cx="7" cy="18" r="2" />
      </>
    ),
    card: (
      <>
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </>
    ),
    package: (
      <>
        <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
        <path d="M12 22V12" />
        <path d="m3.3 7 7.7 4.4 7.7-4.4" />
      </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {icons[name]}
    </svg>
  );
};

/* ── Shared brand mark ──────────────────────────────────────────────────── */

const Wordmark = () => (
  <a href="/" className="m-nav__brand">
    <SkyeCloud width={32} color="var(--ink)" />
    <span className="m-nav__brand__text">skye</span>
  </a>
);

/* ── Sections ───────────────────────────────────────────────────────────── */

const Nav = () => {
  const navigate = useNavigate();
  return (
    <nav className="m-nav">
      <div className="m-nav__inner">
        <Wordmark />
        <div className="m-nav__links">
          <a href="#features">Features</a>
          <a href="#stories">Stories</a>
          <a href="#pricing">Pricing</a>
          <a href="#">Help</a>
        </div>
        <div className="m-nav__spacer" />
        <div className="m-nav__actions">
          <button
            className="skye-btn skye-btn-ghost"
            onClick={() => navigate("/login")}
          >
            Sign in
          </button>
          <button
            className="skye-btn skye-btn-primary"
            onClick={() => navigate("/register")}
          >
            Start your store
          </button>
        </div>
      </div>
    </nav>
  );
};

const HeroPreview = () => {
  const products = [
    {
      name: "Honey loaf, sliced",
      price: "$8.50",
      bg: "radial-gradient(120% 80% at 30% 30%, #F4D8A8 0%, #E8B07A 50%, #C48253 100%)",
    },
    {
      name: "Smoked oolong, 50g",
      price: "$14.00",
      bg: "radial-gradient(120% 80% at 70% 40%, #E8E2D0 0%, #B8A77F 60%, #7A6748 100%)",
    },
    {
      name: "Sunset candle, no.7",
      price: "$24.00",
      bg: "radial-gradient(120% 80% at 50% 60%, #FCE7DE 0%, #EE9B7A 50%, #C8442A 100%)",
    },
  ];
  return (
    <div className="m-hero__preview">
      <div className="m-hero__preview-bar">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
        <span className="url">rosebrew.skye.shop</span>
      </div>
      <div className="m-hero__preview-body">
        {products.map((p, i) => (
          <div key={i} className="m-hero__pproduct">
            <div className="img" style={{ background: p.bg }} />
            <div className="info">
              <div className="name">{p.name}</div>
              <div className="price">{p.price}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Hero = () => {
  const navigate = useNavigate();
  return (
    <section className="m-hero">
      <div className="m-hero__eyebrow">
        <span className="dot" />
        Used by 18,400+ shops this month
      </div>
      <h1 className="m-hero__title">
        Your shop, <em>online</em>
        <br />
        in three minutes.
      </h1>
      <p className="m-hero__sub">
        Skye is the calmest way to put your business online. Pick a name, drop
        in a few photos, and you're selling — no settings to wrestle with.
      </p>
      <div className="m-hero__cta">
        <button
          className="skye-btn skye-btn-primary"
          style={{ height: 52, padding: "0 24px", fontSize: 16 }}
          onClick={() => navigate("/register")}
        >
          Start your store · free
          <Icon name="arrow" style={{ width: 16, height: 16 }} />
        </button>
        <button
          className="skye-btn skye-btn-ghost"
          style={{ height: 52, padding: "0 20px", fontSize: 16 }}
        >
          See a live example
        </button>
      </div>
      <HeroPreview />
    </section>
  );
};

const Features = () => {
  const items = [
    {
      icon: "store",
      tone: "",
      title: "Picks your design for you",
      body: "Tell us your shop name and Skye picks a layout, font pair, and color palette that fit. Change anything you like, later.",
    },
    {
      icon: "card",
      tone: "alt",
      title: "Payments built in",
      body: "Skye plugs into Stripe and Apple Pay out of the box. The first sale just works — no merchant account paperwork.",
    },
    {
      icon: "truck",
      tone: "alt2",
      title: "Shipping that makes sense",
      body: "Print a label, mark it shipped. We auto-fill the buyer's tracking email so you never have to copy-paste.",
    },
    {
      icon: "globe",
      tone: "",
      title: "A real web address",
      body: "You're live at your-name.skye.shop the moment you sign up. Bring your own .com when you're ready.",
    },
    {
      icon: "package",
      tone: "alt",
      title: "Add a product in 20 seconds",
      body: "Photo, name, price — that's the form. Skye writes the description for you if you want it to.",
    },
    {
      icon: "sparkles",
      tone: "alt2",
      title: "No settings screens",
      body: "No CSS, no DNS, no plug-ins. Skye decides the boring stuff so you can focus on what you sell.",
    },
  ];
  return (
    <section className="m-features" id="features">
      <div className="m-features__head">
        <h2>Everything decided. Everything yours to change.</h2>
        <p>
          Skye is opinionated by default. That's how a flower shop in Tulsa gets
          a website that looks like it cost ten thousand dollars.
        </p>
      </div>
      <div className="m-features__grid">
        {items.map((it, i) => (
          <div key={i} className={`m-feature ${it.tone}`}>
            <div className="m-feature__icon">
              <Icon name={it.icon} />
            </div>
            <div className="m-feature__title">{it.title}</div>
            <p className="m-feature__body">{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const Stats = () => (
  <section className="m-stats">
    <div className="m-stats__inner">
      <div>
        <div className="m-stat__value">2:47</div>
        <div className="m-stat__label">Median time to first product</div>
      </div>
      <div>
        <div className="m-stat__value">$0</div>
        <div className="m-stat__label">Monthly fee, ever</div>
      </div>
      <div>
        <div className="m-stat__value">2.9%</div>
        <div className="m-stat__label">+ 30¢ per sale, that's it</div>
      </div>
      <div>
        <div className="m-stat__value">18,400</div>
        <div className="m-stat__label">Stores opened this month</div>
      </div>
    </div>
  </section>
);

const Pricing = () => {
  const navigate = useNavigate();
  return (
    <section className="m-pricing" id="pricing">
      <h2>One plan. No surprises.</h2>
      <p
        style={{
          color: "var(--ink-2)",
          maxWidth: 520,
          margin: "16px auto 0",
          fontSize: 18,
        }}
      >
        You pay nothing until you make a sale. That's how confident we are this
        works.
      </p>
      <div className="m-pricing__card">
        <div className="m-pricing__label">Skye</div>
        <div className="m-pricing__price">
          $0
          <span className="m-pricing__price-period"> / month</span>
        </div>
        <p className="m-pricing__sub">
          Plus 2.9% + 30¢ per sale. Stop any time.
        </p>
        <ul className="m-pricing__list">
          <li>
            <Icon name="check" />
            Unlimited products and orders
          </li>
          <li>
            <Icon name="check" />
            Built-in payments, shipping, and email
          </li>
          <li>
            <Icon name="check" />
            your-name.skye.shop included
          </li>
          <li>
            <Icon name="check" />
            Bring your own domain anytime
          </li>
          <li>
            <Icon name="check" />
            Apple Pay, Google Pay, all major cards
          </li>
        </ul>
        <button
          className="skye-btn skye-btn-primary"
          style={{ width: "100%", height: 52, fontSize: 16 }}
          onClick={() => navigate("/register")}
        >
          Start your store
        </button>
      </div>
    </section>
  );
};

const Closing = () => {
  const navigate = useNavigate();
  return (
    <section className="m-closing">
      <h2>Three minutes is all it takes.</h2>
      <p>You're closer to selling online than you think.</p>
      <button
        className="skye-btn skye-btn-accent"
        style={{ height: 52, padding: "0 28px", fontSize: 16 }}
        onClick={() => navigate("/register")}
      >
        <Icon name="sparkles" style={{ width: 16, height: 16 }} />
        Start your store · free
      </button>
    </section>
  );
};

const Footer = () => (
  <footer className="m-footer">
    <div className="m-footer__inner">
      <div className="m-footer__col">
        <Wordmark />
        <p
          style={{
            color: "var(--ink-3)",
            fontSize: 13,
            marginTop: 16,
            maxWidth: 280,
            lineHeight: 1.5,
          }}
        >
          Skye is the calmest way to put your business online.
        </p>
      </div>
      <div className="m-footer__col">
        <h6>Product</h6>
        <ul>
          <li>
            <a href="#features">Features</a>
          </li>
          <li>
            <a href="#pricing">Pricing</a>
          </li>
          <li>
            <a href="#">Examples</a>
          </li>
          <li>
            <a href="#">Domains</a>
          </li>
        </ul>
      </div>
      <div className="m-footer__col">
        <h6>Help</h6>
        <ul>
          <li>
            <a href="#">Get started</a>
          </li>
          <li>
            <a href="#">Guides</a>
          </li>
          <li>
            <a href="#">Contact</a>
          </li>
          <li>
            <a href="#">Status</a>
          </li>
        </ul>
      </div>
      <div className="m-footer__col">
        <h6>Company</h6>
        <ul>
          <li>
            <a href="#">About</a>
          </li>
          <li>
            <a href="#">Stories</a>
          </li>
          <li>
            <a href="#">Press</a>
          </li>
          <li>
            <a href="#">Jobs</a>
          </li>
        </ul>
      </div>
    </div>
    <div className="m-footer__legal">
      <span>© 2026 Skye Commerce, Inc.</span>
      <span>Made for shopkeepers, by shopkeepers.</span>
    </div>
  </footer>
);

/* ── Page export ────────────────────────────────────────────────────────── */

export default function MarketingPage() {
  return (
    <div className="m-page" data-screen-label="01 Marketing home">
      <Nav />
      <Hero />
      <Features />
      <Stats />
      <Pricing />
      <Closing />
      <Footer />
    </div>
  );
}
