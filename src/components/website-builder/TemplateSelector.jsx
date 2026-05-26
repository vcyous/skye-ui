import { CheckCircleFilled } from "@ant-design/icons";
import { Typography } from "antd";
import { templateRegistry } from "./templateRegistry";

export default function TemplateSelector({ selectedId, onSelect }) {
  return (
    <div className="wb-template-grid">
      {templateRegistry.map((template) => {
        const isActive = template.id === selectedId;
        return (
          <button
            key={template.id}
            type="button"
            className={`wb-template-card ${isActive ? "wb-template-card--active" : ""}`}
            onClick={() => onSelect(template.id)}
          >
            {/* Thumbnail gradient */}
            <div
              className="wb-template-thumb"
              style={{
                background: `linear-gradient(135deg, ${template.gradientFrom}, ${template.gradientTo})`,
              }}
            >
              {isActive && <CheckCircleFilled className="wb-template-check" />}
              {/* Mini layout wireframe */}
              <div className="wb-template-wireframe">
                <div className="wb-wf-bar" />
                <div className="wb-wf-hero" />
                <div className="wb-wf-row">
                  <div className="wb-wf-box" />
                  <div className="wb-wf-box" />
                  <div className="wb-wf-box" />
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="wb-template-meta">
              <Typography.Text strong className="wb-template-name">
                {template.name}
              </Typography.Text>
              <Typography.Text type="secondary" className="wb-template-desc">
                {template.description}
              </Typography.Text>
            </div>
          </button>
        );
      })}
    </div>
  );
}
