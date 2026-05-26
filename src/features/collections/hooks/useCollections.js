import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCollection,
  deleteCollection,
  getCollections,
  getProducts,
  updateCollection,
  updateCollectionProducts,
} from "../../../services/api";

function readErrorMessage(err, fallback) {
  return err instanceof Error ? err.message : fallback;
}

export function useCollections() {
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoadError("");
    setIsLoading(true);
    try {
      const [list, productList] = await Promise.all([
        getCollections({ status: "all", collectionType: "all", search: "" }),
        getProducts("all"),
      ]);
      setCollections(list.map((c) => ({ ...c, rules: c.rules ?? undefined })));
      setProducts(productList);
    } catch (err) {
      setLoadError(readErrorMessage(err, "Failed to load collections."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleCollections = useMemo(() => {
    let rows = [...collections];
    if (statusTab !== "all") {
      rows = rows.filter((c) => c.status === statusTab);
    }
    const term = search.trim().toLowerCase();
    if (term) {
      rows = rows.filter((c) =>
        [c.name, c.description, c.urlHandle]
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
    }
    return rows;
  }, [collections, statusTab, search]);

  const tabCounts = useMemo(() => {
    const counts = { all: collections.length };
    for (const c of collections) {
      counts[c.status] = (counts[c.status] || 0) + 1;
    }
    return counts;
  }, [collections]);

  const createNew = useCallback(
    async (values) => {
      setNotice({ type: "", message: "" });
      setIsSubmitting(true);
      try {
        await createCollection(values);
        await loadData();
        setNotice({ type: "success", message: "Collection created." });
        return true;
      } catch (err) {
        setNotice({
          type: "error",
          message: readErrorMessage(err, "Failed to create collection."),
        });
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [loadData],
  );

  const update = useCallback(
    async (id, values) => {
      setNotice({ type: "", message: "" });
      setIsUpdating(true);
      try {
        await updateCollection(id, values);
        await loadData();
        setNotice({ type: "success", message: "Collection updated." });
        return true;
      } catch (err) {
        setNotice({
          type: "error",
          message: readErrorMessage(err, "Failed to update collection."),
        });
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [loadData],
  );

  const remove = useCallback(
    async (record) => {
      setNotice({ type: "", message: "" });
      try {
        await deleteCollection(record.id);
        await loadData();
        setNotice({ type: "success", message: "Collection deleted." });
      } catch (err) {
        setNotice({
          type: "error",
          message: readErrorMessage(err, "Failed to delete collection."),
        });
      }
    },
    [loadData],
  );

  const assignProducts = useCallback(
    async (collectionId, productIds) => {
      setNotice({ type: "", message: "" });
      setIsAssigning(true);
      try {
        await updateCollectionProducts(collectionId, productIds || []);
        await loadData();
        setNotice({ type: "success", message: "Products updated." });
        return true;
      } catch (err) {
        setNotice({
          type: "error",
          message: readErrorMessage(err, "Failed to assign products."),
        });
        return false;
      } finally {
        setIsAssigning(false);
      }
    },
    [loadData],
  );

  return {
    collections,
    products,
    visibleCollections,
    tabCounts,
    isLoading,
    loadError,
    notice,
    setNotice,
    statusTab,
    setStatusTab,
    search,
    setSearch,
    isSubmitting,
    isUpdating,
    isAssigning,
    loadData,
    createNew,
    update,
    remove,
    assignProducts,
  };
}
