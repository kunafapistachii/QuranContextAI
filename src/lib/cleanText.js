// UmmahAPI translation text embeds footnote reference numbers directly in the string
// ("wives1", "themselves,2") with no brackets or spacing, and we don't display the
// corresponding footnotes — so they read as random stray digits. Strip them: a 1-2 digit
// run glued directly onto a preceding letter/punctuation (no space), followed by
// whitespace/punctuation/end. Capped at 2 digits (footnote refs are never longer) so a
// real number like "70,000" or "100" — always space-separated or 3+ digits — is untouched.
export function stripFootnoteMarkers(text) {
  if (!text) return text
  return text.replace(/(?<=[\p{L}.,;:)\]])\d{1,2}(?=[\s.,;:)"'’]|$)/gu, '')
}
