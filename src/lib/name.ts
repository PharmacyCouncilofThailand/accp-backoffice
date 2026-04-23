/**
 * Concatenate first, optional middle, and last name into a single display string.
 *
 * - Skips null/undefined/empty parts
 * - Normalizes internal whitespace
 *
 * @example
 *   getFullName("John", "William", "Smith") -> "John William Smith"
 *   getFullName("John", null, "Smith")      -> "John Smith"
 *   getFullName("John", "", "Smith")        -> "John Smith"
 */
export function getFullName(
  firstName?: string | null,
  middleName?: string | null,
  lastName?: string | null,
): string {
  return [firstName, middleName, lastName]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * Get avatar-style initials from a name (first letter of first + last name).
 * Skips middle name on purpose to match common UI avatar conventions.
 */
export function getInitials(
  firstName?: string | null,
  lastName?: string | null,
): string {
  const f = (firstName ?? "").trim().charAt(0).toUpperCase();
  const l = (lastName ?? "").trim().charAt(0).toUpperCase();
  return `${f}${l}`;
}
