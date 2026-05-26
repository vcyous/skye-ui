import { memo, useMemo, useState } from "react";
import { templateRegistry } from "./templateRegistry";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "clean-minimal", label: "Clean & minimal" },
  { key: "bold-joyful", label: "Bold & joyful" },
  { key: "editorial-dark", label: "Editorial & dark" },
];

const TEXT_MAX = {
  heroTitle: 90,
  heroSubtitle: 320,
  ctaButton: 28,
  featuredHeading: 60,
  collectionHeading: 60,
  testimonialQuote: 220,
  newsletterHeading: 60,
};

export { TEXT_MAX };

const TemplatePreview = memo(function TemplatePreview({ entry }) {
  const Component = entry.component;
  const config = useMemo(
    () => ({
      texts: { ...entry.defaultConfig.texts },
      colors: { ...entry.defaultConfig.colors },
      images: { logoUrl: "", heroImageUrl: "" },
      catalog: {
        collectionId: null,
        displayCount: 3,
        layout: "grid-3",
      },
    }),
    [entry],
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 1280,
        transformOrigin: "top left",
        transform: "scale(0.258)",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <Component config={config} storeName="My Store" products={[]} />
    </div>
  );
});

function TemplateCard({ entry, isActive, onUse }) {
  return (
    <div
      className={`builder-tcard${isActive ? " builder-tcard--active" : ""}`}
      onClick={onUse}
    >
      <div className="builder-tcard__preview">
        <TemplatePreview entry={entry} />
        <div className="builder-tcard__overlay">
          <button
            type="button"
            className="builder-tcard__choose-btn"
            onClick={(e) => {
              e.stopPropagation();
              onUse();
            }}
          >
            {isActive ? "Continue editing" : `Choose ${entry.name}`} →
          </button>
        </div>
      </div>

      <div className="builder-tcard__info">
        <div className="builder-tcard__tag">{entry.tag}</div>
        <div className="builder-tcard__name">{entry.name}</div>
        <div className="builder-tcard__swatches">
          {entry.swatches.map((color) => (
            <div
              key={color}
              className="builder-tcard__swatch"
              style={{ background: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BuilderGallery({ selectedId, onUseTemplate }) {
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered =
    activeFilter === "all"
      ? templateRegistry
      : templateRegistry.filter((t) => t.category === activeFilter);

  return (
    <div className="builder-gallery">
      <div className="builder-gallery__inner">
        <div className="builder-gallery__header">
          <div className="builder-gallery__headline">
            <div>Pick a starting point.</div>
            <div>You can swap it later.</div>
          </div>
          <p className="builder-gallery__desc">
            Every template comes wired up with everything you need. You'll be
            able to change colors, text, and images — the layout stays as a
            guardrail so it always looks right.
          </p>
        </div>

        <div className="builder-gallery__filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`builder-gallery__filter${activeFilter === f.key ? " active" : ""}`}
              onClick={() => setActiveFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="builder-gallery__grid">
          {filtered.map((entry) => (
            <TemplateCard
              key={entry.id}
              entry={entry}
              isActive={entry.id === selectedId}
              onUse={() => onUseTemplate(entry.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
