// Emails allowed to use the Letters module — a private space shared between
// exactly two people, unlike every other module in this app (which is fully
// private per-user via RLS). Kept in sync with the RLS policies in
// supabase/letters_schema.sql — update both places if this ever changes.
export const LETTERS_ALLOWED_EMAILS = ["terrencefinchum@gmail.com", "brookefinchum@gmail.com"];

export const LETTERS_PEOPLE: Record<string, string> = {
  "terrencefinchum@gmail.com": "Terrence",
  "brookefinchum@gmail.com": "Brooke",
};

export function isLettersAllowed(email: string | null | undefined): boolean {
  return !!email && LETTERS_ALLOWED_EMAILS.includes(email.toLowerCase());
}
