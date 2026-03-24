import type { PostgrestError } from "@supabase/supabase-js";

/** PostgREST when table/view is missing from API schema cache */
export function isMissingRelationError(error: PostgrestError | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST205") return true;
  const msg = error.message ?? "";
  return (
    /schema cache/i.test(msg) ||
    /does not exist/i.test(msg) ||
    /Could not find the table/i.test(msg)
  );
}
