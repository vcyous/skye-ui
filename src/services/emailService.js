import { getStoreContext } from "./storeService";
import { supabase } from "./supabaseClient";
import { normalizeError } from "./utils/errorUtils";

export async function sendEmail(payload) {
  let storeId;
  try {
    const { store } = await getStoreContext();
    storeId = store.id;
  } catch {
    console.warn("[emailService] No store context — email not logged.");
    return;
  }

  const { error: insertError } = await supabase
    .from("email_notifications")
    .insert({
      store_id: storeId,
      order_id: payload.orderId ?? null,
      recipient: payload.recipient,
      subject: payload.subject,
      template: payload.template,
      payload: payload.data,
      status: "queued",
    });

  if (insertError) {
    console.warn(
      "[emailService] Failed to log notification:",
      normalizeError(insertError).message,
    );
    return;
  }

  // Stub for real email provider — uncomment and add API key to .env:
  // const apiKey = import.meta.env.VITE_RESEND_API_KEY;
  // if (!apiKey) {
  //   console.log(`[emailService] ${payload.template} queued (no API key configured) → ${payload.recipient}`);
  //   return;
  // }
  // try {
  //   await fetch('https://api.resend.com/emails', {
  //     method: 'POST',
  //     headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       from: 'store@skye.id',
  //       to: payload.recipient,
  //       subject: payload.subject,
  //       html: `<pre>${JSON.stringify(payload.data, null, 2)}</pre>`,
  //     }),
  //   });
  //   await supabase.from('email_notifications').update({ status: 'sent', sent_at: new Date().toISOString() })
  //     .eq('store_id', storeId).eq('recipient', payload.recipient).eq('template', payload.template)
  //     .order('created_at', { ascending: false }).limit(1);
  // } catch (err) {
  //   console.error('[emailService] Send failed:', err);
  // }

  console.log(
    `[emailService] ${payload.template} queued → ${payload.recipient}`,
  );
}
