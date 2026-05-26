import { useCallback, useEffect, useMemo, useState } from "react";
import {
  bulkDeleteProducts,
  bulkUpdateProductStatus,
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
  uploadProductImage,
} from "../../../services/api";
import { toProductPayload } from "../productMapper";

function readErrorMessage(err, fallback) {
  return err instanceof Error ? err.message : fallback;
}

function applyFilters(products, search, sortBy) {
  const keyword = search.trim().toLowerCase();
  let rows = [...products];
  if (keyword) {
    rows = rows.filter((product) => {
      const haystack = [
        product.name,
        product.sku,
        product.description,
        ...(product.tags || []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }
  rows.sort((a, b) => {
    if (sortBy === "price_high") return Number(b.price || 0) - Number(a.price || 0);
    if (sortBy === "price_low") return Number(a.price || 0) - Number(b.price || 0);
    if (sortBy === "stock_high") return Number(b.stock || 0) - Number(a.stock || 0);
    if (sortBy === "name_asc")
      return String(a.name || "").localeCompare(String(b.name || ""));
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return rows;
}

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const [submitError, setSubmitError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const loadProducts = useCallback(async () => {
    setLoadError("");
    setIsLoading(true);
    try {
      const list = await getProducts(status);
      setProducts(list);
    } catch (err) {
      setLoadError(readErrorMessage(err, "Failed to load products."));
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const visibleProducts = useMemo(
    () => applyFilters(products, search, sortBy),
    [products, search, sortBy],
  );

  const tabCounts = useMemo(() => {
    const counts = { all: products.length };
    for (const p of products) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return counts;
  }, [products]);

  const createNew = useCallback(
    async (values, mediaUrls) => {
      setSubmitError("");
      setNotice("");
      setIsSubmitting(true);
      try {
        await createProduct(toProductPayload(values, mediaUrls));
        await loadProducts();
        setNotice("Product created successfully.");
        return true;
      } catch (err) {
        setSubmitError(readErrorMessage(err, "Failed to create product."));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [loadProducts],
  );

  const update = useCallback(
    async (productId, values, mediaUrls) => {
      setIsUpdating(true);
      setSubmitError("");
      setNotice("");
      try {
        await updateProduct(productId, toProductPayload(values, mediaUrls));
        await loadProducts();
        setNotice("Product updated.");
        return true;
      } catch (err) {
        setSubmitError(readErrorMessage(err, "Failed to update product."));
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [loadProducts],
  );

  const remove = useCallback(
    async (product) => {
      setSubmitError("");
      setNotice("");
      try {
        await deleteProduct(product.id);
        await loadProducts();
        setNotice("Product deleted.");
      } catch (err) {
        setSubmitError(readErrorMessage(err, "Failed to delete product."));
      }
    },
    [loadProducts],
  );

  const bulkUpdateStatus = useCallback(
    async (nextStatus) => {
      if (!selectedRowKeys.length) return;
      setSubmitError("");
      setNotice("");
      setIsBulkBusy(true);
      try {
        const result = await bulkUpdateProductStatus(selectedRowKeys, nextStatus);
        await loadProducts();
        setSelectedRowKeys([]);
        setNotice(`${result.updatedCount} products updated to ${nextStatus}.`);
      } catch (err) {
        setSubmitError(readErrorMessage(err, "Failed bulk status update."));
      } finally {
        setIsBulkBusy(false);
      }
    },
    [loadProducts, selectedRowKeys],
  );

  const bulkRemove = useCallback(async () => {
    if (!selectedRowKeys.length) return;
    setSubmitError("");
    setNotice("");
    setIsBulkBusy(true);
    try {
      const result = await bulkDeleteProducts(selectedRowKeys);
      await loadProducts();
      setSelectedRowKeys([]);
      setNotice(`${result.deletedCount} products deleted.`);
    } catch (err) {
      setSubmitError(readErrorMessage(err, "Failed bulk delete."));
    } finally {
      setIsBulkBusy(false);
    }
  }, [loadProducts, selectedRowKeys]);

  const uploadImage = useCallback(async (file) => {
    const tempId = `temp-${Date.now()}`;
    try {
      return await uploadProductImage(file, tempId);
    } catch (err) {
      setSubmitError(readErrorMessage(err, "Image upload failed."));
      return null;
    }
  }, []);

  return {
    products,
    visibleProducts,
    tabCounts,
    isLoading,
    loadError,
    status,
    setStatus,
    search,
    setSearch,
    sortBy,
    setSortBy,
    selectedRowKeys,
    setSelectedRowKeys,
    submitError,
    setSubmitError,
    notice,
    setNotice,
    isSubmitting,
    isUpdating,
    isBulkBusy,
    loadProducts,
    createNew,
    update,
    remove,
    bulkUpdateStatus,
    bulkRemove,
    uploadImage,
  };
}
