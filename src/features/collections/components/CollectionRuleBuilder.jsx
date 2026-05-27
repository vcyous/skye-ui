import { useWatch, useFieldArray, Controller } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MATCH_MODE_OPTIONS,
  RULE_FIELD_OPTIONS,
  RULE_OPERATOR_OPTIONS,
} from "../constants";

export default function CollectionRuleBuilder({
  control,
  register,
  typeField = "collectionType",
  name = "rules",
}) {
  const collectionType = useWatch({ control, name: typeField });

  const { fields, append, remove } = useFieldArray({
    control,
    name: `${name}.conditions`,
  });

  if (collectionType !== "smart") {
    return (
      <Alert className="mt-2">
        <AlertDescription>
          <span className="font-medium">Manual collection</span> — products are
          added manually. After saving, use the Assign Products action to pick
          which products appear in this collection.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mt-2">
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Conditions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Products must match</span>
          <Controller
            control={control}
            name={`${name}.match`}
            defaultValue="all"
            rules={{ required: true }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATCH_MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start"
            >
              <Controller
                control={control}
                name={`${name}.conditions.${index}.field`}
                rules={{ required: "Required" }}
                render={({ field: f }) => (
                  <Select value={f.value} onValueChange={f.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Field" />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_FIELD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Controller
                control={control}
                name={`${name}.conditions.${index}.operator`}
                rules={{ required: "Required" }}
                render={({ field: f }) => (
                  <Select value={f.value} onValueChange={f.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_OPERATOR_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Input
                placeholder="Value"
                {...register(`${name}.conditions.${index}.value`, {
                  required: "Required",
                })}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() =>
            append({ field: "name", operator: "contains", value: "" })
          }
        >
          <Plus className="size-4" />
          Add condition
        </Button>
      </CardContent>
    </Card>
  );
}
