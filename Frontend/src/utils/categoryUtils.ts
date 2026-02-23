import { Category } from "../services/api/admin/adminProductService";

/**
 * Search categories by name (case-insensitive)
 */
export function searchCategories(
  categories: Category[],
  searchQuery: string
): Category[] {
  if (!searchQuery.trim()) {
    return categories;
  }

  const query = searchQuery.toLowerCase();
  return categories.filter((cat) => cat.name.toLowerCase().includes(query));
}

/**
 * Filter categories by status
 */
export function filterCategoriesByStatus(
  categories: Category[],
  status: "All" | "Active" | "Inactive"
): Category[] {
  if (status === "All") {
    return categories;
  }
  return categories.filter((cat) => cat.status === status);
}

/**
 * Get all active categories (for dropdowns, etc.)
 */
export function getActiveCategories(categories: Category[]): Category[] {
  return categories.filter((cat) => cat.status === "Active");
}
