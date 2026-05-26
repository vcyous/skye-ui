import {
  CheckOutlined,
  CloseOutlined,
  LockOutlined,
  RocketOutlined,
} from "@ant-design/icons";

function previewSlug(storeName, subdomain) {
  if (subdomain) return subdomain;
  return (
    storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "yourstore"
  );
}

export function PublishModal({
  open,
  isPublishing,
  storeName,
  subdomain,
  onConfirm,
  onClose,
}) {
  if (!open) return null;
  const slug = previewSlug(storeName, subdomain);

  return (
    <div
      className="builder-modal-center"
      onClick={isPublishing ? undefined : onClose}
    >
      <div className="builder-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="builder-modal-close"
          onClick={onClose}
          disabled={isPublishing}
        >
          <CloseOutlined />
        </button>

        <div className="builder-modal-chip">
          <RocketOutlined />
        </div>

        <h2 className="builder-modal-title">Ready to go live?</h2>
        <p className="builder-modal-text">
          Your store will be visible at the address below. Payments will start
          working immediately.
        </p>

        <div className="builder-modal-url">
          <LockOutlined style={{ fontSize: 11, color: "var(--sage)" }} />

          <span style={{ color: "var(--ink-4)" }}>https://</span>
          <strong>{slug}.skye.id</strong>
        </div>

        <div className="builder-modal-actions">
          <button
            type="button"
            className="builder-modal-btn builder-modal-btn--secondary"
            onClick={onClose}
            disabled={isPublishing}
          >
            Not yet
          </button>
          <button
            type="button"
            className="builder-modal-btn builder-modal-btn--primary"
            onClick={onConfirm}
            disabled={isPublishing}
          >
            {isPublishing ? "Publishing…" : "Publish →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CelebrationModal({ open, storeName, subdomain, onClose }) {
  if (!open) return null;
  const slug = previewSlug(storeName, subdomain);

  return (
    <div className="builder-modal-center" onClick={onClose}>
      <div className="builder-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="builder-modal-close" onClick={onClose}>
          <CloseOutlined />
        </button>

        <div className="builder-modal-chip builder-modal-chip--sage">
          <CheckOutlined />
        </div>

        <h2 className="builder-modal-title">
          You're live. <span aria-label="celebrate">🎉</span>
        </h2>
        <p className="builder-modal-text">
          {storeName || "Your store"} is open for business. Share the link with
          your first buyers.
        </p>

        <div className="builder-modal-url">
          <LockOutlined style={{ fontSize: 11, color: "var(--sage)" }} />

          <span style={{ color: "var(--ink-4)" }}>https://</span>
          <strong>{slug}.skye.id</strong>
        </div>

        <div className="builder-modal-actions">
          <button
            type="button"
            className="builder-modal-btn builder-modal-btn--secondary"
            onClick={onClose}
          >
            Back to builder
          </button>
          <a
            className="builder-modal-btn builder-modal-btn--primary"
            href={`https://${slug}.skye.id`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit store →
          </a>
        </div>
      </div>
    </div>
  );
}
