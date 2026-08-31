// The two accounts that share and co-edit everything in this app — Debts,
// Bills, Goals, and Letters — instead of the usual private-per-user model.
// Kept in sync with the RLS policies in supabase/couple_sharing.sql and
// supabase/letters_schema.sql — update all three places if this ever changes.
export const COUPLE_EMAILS = ["terrencefinchum@gmail.com", "brookefinchum@gmail.com"];

export const COUPLE_PEOPLE: Record<string, string> = {
  "terrencefinchum@gmail.com": "Terrence",
  "brookefinchum@gmail.com": "Brooke",
};

export function isCoupleMember(email: string | null | undefined): boolean {
  return !!email && COUPLE_EMAILS.includes(email.toLowerCase());
}
