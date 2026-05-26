import { DEFAULT_SMART_RULES } from "./constants";

export function toCollectionFormValues(collection) {
  if (!collection) return {};
  return {
    name: collection.name,
    urlHandle: collection.urlHandle || "",
    description: collection.description,
    seoTitle: collection.seoTitle || "",
    seoDescription: collection.seoDescription || "",
    collectionType: collection.collectionType,
    status: collection.status,
    rules:
      collection.rules ||
      (collection.collectionType === "smart" ? DEFAULT_SMART_RULES : undefined),
  };
}

export const CREATE_INITIAL_VALUES = {
  collectionType: "manual",
  status: "draft",
  rules: DEFAULT_SMART_RULES,
};
