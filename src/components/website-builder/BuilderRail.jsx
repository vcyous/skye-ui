import {
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  LayoutGrid,
  Lock,
  Mail,
  Pencil,
  Store,
} from "lucide-react";
import { useState } from "react";

const SECTIONS = [
  {
    key: "hero",
    label: "Hero",
    icon: <FileText className="size-3.5" />,
    defaultStatus: "visible",
  },
  {
    key: "content",
    label: "Featured Section",
    icon: <LayoutGrid className="size-3.5" />,
    defaultStatus: "visible",
  },
  {
    key: "products",
    label: "Products",
    icon: <Store className="size-3.5" />,
    defaultStatus: "visible",
  },
  {
    key: "newsletter",
    label: "Newsletter",
    icon: <Mail className="size-3.5" />,
    defaultStatus: "visible",
  },
  {
    key: "footer",
    label: "Footer",
    icon: <Lock className="size-3.5" />,
    defaultStatus: "locked",
  },
];

export default function BuilderRail({ activePanel, onEditSection }) {
  const [hidden, setHidden] = useState(new Set());

  function toggleVisibility(key, e) {
    e.stopPropagation();
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <aside className="builder-rail">
      <div className="builder-rail__head">
        <div className="builder-rail__title">Sections</div>
        <div className="builder-rail__sub">
          Click a section to edit its content
        </div>
      </div>

      <ul className="builder-rail__list">
        {SECTIONS.map((section) => {
          const isLocked = section.defaultStatus === "locked";
          const isHidden = !isLocked && hidden.has(section.key);
          const isActive = activePanel === section.key;
          const statusLabel = isLocked
            ? "LOCKED"
            : isHidden
              ? "HIDDEN"
              : "VISIBLE";

          return (
            <li
              key={section.key}
              className={[
                "builder-rail__item",
                isActive ? "active" : "",
                isLocked ? "locked" : "",
                isHidden ? "dimmed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={isLocked ? undefined : () => onEditSection(section.key)}
            >
              <span className="builder-rail__drag">
                <GripVertical className="size-3.5" />
              </span>
              <span className="builder-rail__icon">{section.icon}</span>
              <div className="builder-rail__label-wrap">
                <span className="builder-rail__label">{section.label}</span>
                <span
                  className={`builder-rail__status builder-rail__status--${statusLabel.toLowerCase()}`}
                >
                  {statusLabel}
                </span>
              </div>

              {isLocked ? (
                <span className="builder-rail__lock">
                  <Lock className="size-3" />
                </span>
              ) : (
                <div className="builder-rail__actions">
                  <button
                    type="button"
                    className="builder-rail__action-btn"
                    onClick={(e) => toggleVisibility(section.key, e)}
                    title={isHidden ? "Show section" : "Hide section"}
                  >
                    {isHidden ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="builder-rail__action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSection(section.key);
                    }}
                    title="Edit section"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="builder-rail__footer">
        <div className="builder-rail__footer-icon">✦</div>
        <div>
          <div className="builder-rail__footer-title">Skye picks the rest</div>
          <div className="builder-rail__footer-text">
            Fonts, spacing, and section layouts are locked so your store always
            looks right.
          </div>
        </div>
      </div>
    </aside>
  );
}
