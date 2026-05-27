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

function applyFilters(products, search, category) {
  const keyword = search.trim().toLowerCase();
  let rows = [...products];

  if (keyword) {
    rows = rows.filter((p) => {
      const haystack = [p.name, p.category, p.description, ...(p.tags || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }

  if (category && category !== "all") {
    rows = rows.filter((p) => p.category === category);
  }

  return rows;
}

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const [submitError, setSubmitError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const loadProducts = useCallback(async () => {
    setLoadError("");
    setIsLoading(true);
    try {
      const list = await getProducts(status);
      setProducts(list);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat produk.");
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const visibleProducts = useMemo(
    () => applyFilters(products, search, category),
    [products, search, category],
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
        setNotice("Produk berhasil dibuat.");
        return true;
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Gagal membuat produk.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [loadProducts],
  );

  const update = useCallback(
    async (productId, values, mediaUrls) => {
      setIsSubmitting(true);
      setSubmitError("");
      setNotice("");
      try {
        await updateProduct(productId, toProductPayload(values, mediaUrls));
        await loadProducts();
        setNotice("Produk diperbarui.");
        return true;
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Gagal memperbarui produk.");
        return false;
      } finally {
        setIsSubmitting(false);
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
        setNotice("Produk dihapus.");
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Gagal menghapus produk.");
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
        setNotice(`${result.updatedCount} produk diperbarui.`);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Gagal update massal.");
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
      setNotice(`${result.deletedCount} produk dihapus.`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal hapus massal.");
    } finally {
      setIsBulkBusy(false);
    }
  }, [loadProducts, selectedRowKeys]);

  const uploadImage = useCallback(async (file) => {
    try {
      return await uploadProductImage(file, `temp-${Date.now()}`);
    } catch {
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
    category,
    setCategory,
    selectedRowKeys,
    setSelectedRowKeys,
    submitError,
    setSubmitError,
    notice,
    setNotice,
    isSubmitting,
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
