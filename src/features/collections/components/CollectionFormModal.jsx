import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CREATE_INITIAL_VALUES,
  toCollectionFormValues,
} from "../collectionMapper";
import { COLLECTION_TYPE_OPTIONS, STATUS_OPTIONS } from "../constants";
import CollectionRuleBuilder from "./CollectionRuleBuilder";

export default function CollectionFormModal({
  mode,
  open,
  collection,
  isSubmitting,
  onSubmit,
  onCancel,
}) {
  const isEdit = mode === "edit";

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: isEdit ? {} : CREATE_INITIAL_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && collection) {
      reset(toCollectionFormValues(collection));
    } else {
      reset(CREATE_INITIAL_VALUES);
    }
  }, [open, isEdit, collection, reset]);

  async function handleFinish(values) {
    const ok = await onSubmit(values);
    if (ok) reset(CREATE_INITIAL_VALUES);
  }

  function handleCancel() {
    reset(CREATE_INITIAL_VALUES);
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit collection" : "Create collection"}
          </DialogTitle>
        </DialogHeader>

        <form
          id="collection-form"
          onSubmit={handleSubmit(handleFinish)}
          className="flex flex-col gap-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-3">
            <div className="flex flex-col gap-3">
              <Card>
                <CardContent className="pt-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name">Title</Label>
                    <Input
                      id="name"
                      placeholder={isEdit ? undefined : "Summer Launch"}
                      {...register("name", { required: "Title is required." })}
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      rows={3}
                      placeholder={isEdit ? undefined : "Optional collection description"}
                      {...register("description")}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium">Collection type</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Controller
                    control={control}
                    name="collectionType"
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {COLLECTION_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <CollectionRuleBuilder control={control} watch={watch} register={register} errors={errors} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium">Search engine listing</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="urlHandle">URL handle</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">collections/</span>
                      <Input
                        id="urlHandle"
                        placeholder={isEdit ? undefined : "summer-launch"}
                        className="pl-[92px]"
                        {...register("urlHandle")}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="seoTitle">Page title</Label>
                    <Input
                      id="seoTitle"
                      placeholder={isEdit ? undefined : "SEO title"}
                      maxLength={70}
                      {...register("seoTitle")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="seoDescription">Meta description</Label>
                    <Textarea
                      id="seoDescription"
                      rows={3}
                      placeholder={isEdit ? undefined : "SEO description"}
                      maxLength={160}
                      {...register("seoDescription")}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-3">
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Controller
                    control={control}
                    name="status"
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="collection-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
            {isEdit ? "Save changes" : "Save collection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
