import { Button } from "@/components/ui/button";

export default function LaunchStep({ values, onLaunch, onBack, isLaunching }) {
  const rows = [
    { label: "Store name", value: values.storeName },
    { label: "Template", value: values.templateSlug },
    { label: "Currency", value: values.currency },
    { label: "Timezone", value: values.timezone },
  ];

  return (
    <>
      <h3 className="text-xl font-semibold">You&apos;re ready to launch</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Review your store details and hit Launch when you&apos;re ready.
      </p>
      <div className="my-6 overflow-hidden rounded-lg border">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`grid grid-cols-[140px_1fr] ${i > 0 ? "border-t" : ""}`}
          >
            <div className="bg-muted px-4 py-2 text-sm font-medium">
              {row.label}
            </div>
            <div className="px-4 py-2 text-sm">{row.value}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button
          size="lg"
          variant="outline"
          onClick={onBack}
          disabled={isLaunching}
        >
          Back
        </Button>
        <Button
          size="lg"
          className="flex-1"
          onClick={onLaunch}
          disabled={isLaunching}
        >
          {isLaunching ? "Launching..." : "Launch My Store"}
        </Button>
      </div>
    </>
  );
}
