import { getStoreContext } from "./storeService";
import { supabase } from "./supabaseClient";
import { normalizeError } from "./utils/errorUtils";

const BUCKET = "store-assets";

function fileExtension(file) {
  const fromName = file?.name?.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return "jpg";
}

export async function uploadStoreAsset(file, assetKey = "asset") {
  const { store } = await getStoreContext();
  const ext = fileExtension(file);
  const path = `${store.id}/${assetKey}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw normalizeError(error);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

export async function uploadProductImage(file, productId = "product") {
  return uploadStoreAsset(file, `products/${productId}`);
}
