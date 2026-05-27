import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { templateRegistry } from "../../../components/website-builder/templateRegistry";

export default function TemplatePickStep({ onNext, onBack }) {
  const [selected, setSelected] = useState(
    templateRegistry[0]?.id ?? "modern-minimal",
  );

  return (
    <>
      <h3 className="text-xl font-semibold">Choose a template</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a starting point for your storefront. You can customise everything
        after launch.
      </p>
      <div className="my-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {templateRegistry.map((tmpl) => (
          <Card
            key={tmpl.id}
            onClick={() => setSelected(tmpl.id)}
            className={`cursor-pointer overflow-hidden p-0 transition-all ${
              selected === tmpl.id
                ? "border-2 border-primary"
                : "border-2 border-transparent hover:border-border"
            }`}
          >
            <div
              className="h-32"
              style={{
                background: `linear-gradient(135deg, ${tmpl.gradientFrom}, ${tmpl.gradientTo})`,
              }}
            />
            <div className="p-3">
              <p className="font-semibold">{tmpl.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {tmpl.description}
              </p>
            </div>
          </Card>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Button size="lg" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" onClick={() => onNext(selected)}>
          Use this template
        </Button>
      </div>
    </>
  );
}
