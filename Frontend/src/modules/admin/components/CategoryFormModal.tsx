import { useState, useEffect, useMemo } from "react";
import {
  Category,
  CreateCategoryData,
  UpdateCategoryData,
} from "../../../services/api/admin/adminProductService";
import { uploadImage } from "../../../services/api/uploadService";
import {
  validateImageFile,
  createImagePreview,
} from "../../../utils/imageUpload";
// HeaderCategory service imports removed as the field is no longer used in the form

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCategoryData | UpdateCategoryData) => Promise<void>;
  category?: Category;
  mode: "create" | "edit";
}

export default function CategoryFormModal({
  isOpen,
  onClose,
  onSubmit,
  category,
  mode,
}: CategoryFormModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    image: "",
    order: 0,
    status: "Active" as "Active" | "Inactive",
    isBestseller: false,
    hasWarning: false,
    groupCategory: "",
    commissionRate: 0,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragging, setIsDragging] = useState(false);


  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && category) {
        // Pre-fill form with category data
        setFormData({
          name: category.name || "",
          image: category.image || "",
          order: category.order || 0,
          status: category.status || "Active",
          isBestseller: category.isBestseller || false,
          hasWarning: category.hasWarning || false,
          groupCategory: category.groupCategory || "",
          commissionRate: category.commissionRate || 0,
        });
        if (category.image) {
          setImagePreview(category.image);
        }
      } else {
        // Reset form for new category
        setFormData({
          name: "",
          image: "",
          order: 0,
          status: "Active",
          isBestseller: false,
          hasWarning: false,
          groupCategory: "",
          commissionRate: 0,
        });
      }
      setImageFile(null);
      setImagePreview(mode === "edit" && category?.image ? category.image : "");
      setErrors({});
      setShowAdvanced(false);
    }
  }, [isOpen, mode, category]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
            ? parseInt(value) || 0
            : value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrors((prev) => ({
        ...prev,
        image: validation.error || "Invalid image file",
      }));
      return;
    }

    setImageFile(file);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.image;
      return newErrors;
    });

    try {
      const preview = await createImagePreview(file);
      setImagePreview(preview);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        image: "Failed to create image preview",
      }));
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Category name is required";
    }

    if (formData.order < 0) {
      newErrors.order = "Display order must be a positive number";
    }

    // Header category validation removed


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      let imageUrl = formData.image;

      // Upload image if a new file is selected
      if (imageFile) {
        setUploading(true);
        const imageResult = await uploadImage(imageFile, "mandibazaar/categories");
        imageUrl = imageResult.secureUrl;
        setUploading(false);
      }

      const submitData: CreateCategoryData | UpdateCategoryData = {
        name: formData.name.trim(),
        image: imageUrl,
        order: formData.order,
        status: formData.status,
        isBestseller: formData.isBestseller,
        hasWarning: formData.hasWarning,
        groupCategory: formData.groupCategory || undefined,
        commissionRate: formData.commissionRate,
      };

      await onSubmit(submitData);
      onClose();
    } catch (error: any) {
      setErrors({
        submit:
          error.response?.data?.message ||
          error.message ||
          "Failed to save category. Please try again.",
      });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const modalTitle =
    mode === "edit"
      ? "Edit Category"
      : "Create Category";

  const isEditMode = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}></div>

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">
            {modalTitle}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            disabled={submitting}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">

          {/* Error Messages */}
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}

          {/* Category Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.name ? "border-red-300" : "border-neutral-300"
                }`}
              placeholder="Enter category name"
              disabled={submitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Header Category and Parent Category fields removed per request */}

          {/* Category Image */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Category Image
            </label>
            <label
              className={`block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isDragging
                ? "border-teal-500 bg-teal-50"
                : "border-neutral-300 hover:border-teal-500"
                }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}>
              {imagePreview ? (
                <div className="space-y-2">
                  <img
                    src={imagePreview}
                    alt="Category preview"
                    className="max-h-32 mx-auto rounded-lg object-cover"
                  />
                  <p className="text-xs text-neutral-600">
                    {imageFile?.name || "Current image"}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setImageFile(null);
                      setImagePreview("");
                      setFormData((prev) => ({ ...prev, image: "" }));
                    }}
                    className="text-xs text-red-600 hover:text-red-700">
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="mx-auto mb-2 text-neutral-400">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <p className="text-xs text-neutral-600">
                    {isDragging ? "Drop image here" : "Choose File or Drag & Drop"}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">Max 5MB</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={submitting || uploading}
              />
            </label>
            {errors.image && (
              <p className="mt-1 text-sm text-red-600">{errors.image}</p>
            )}
          </div>

          {/* Parent Category field removed per request */}

          {/* Display Order */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Display Order
            </label>
            <input
              type="number"
              name="order"
              value={formData.order}
              onChange={handleInputChange}
              min="0"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.order ? "border-red-300" : "border-neutral-300"
                }`}
              disabled={submitting}
            />
            {errors.order && (
              <p className="mt-1 text-sm text-red-600">{errors.order}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Commission Rate (%)
            </label>
            <input
              type="number"
              name="commissionRate"
              value={formData.commissionRate}
              onChange={handleInputChange}
              min="0"
              max="100"
              step="0.01"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.commissionRate
                ? "border-red-300"
                : "border-neutral-300"
                }`}
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-neutral-500">
              Override default commission rate for this category (0 = use default)
            </p>
            {errors.commissionRate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.commissionRate}
              </p>
            )}
          </div>

          {/* Active Status */}
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="status"
                checked={formData.status === "Active"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.checked ? "Active" : "Inactive",
                  }))
                }
                className="mr-2"
                disabled={submitting}
              />
              <span className="text-sm font-medium text-neutral-700">
                Active Status
              </span>
            </label>
          </div>

          {/* Advanced Fields (Collapsible) */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-neutral-700 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
              <span>Advanced Settings</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className={`transform transition-transform ${showAdvanced ? "rotate-180" : ""
                  }`}>
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {showAdvanced && (
              <div className="mt-2 p-4 bg-neutral-50 rounded-lg space-y-4">
                {/* Is Bestseller */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="isBestseller"
                      checked={formData.isBestseller}
                      onChange={handleInputChange}
                      className="mr-2"
                      disabled={submitting}
                    />
                    <span className="text-sm font-medium text-neutral-700">
                      Is Bestseller Category
                    </span>
                  </label>
                </div>

                {/* Has Warning */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="hasWarning"
                      checked={formData.hasWarning}
                      onChange={handleInputChange}
                      className="mr-2"
                      disabled={submitting}
                    />
                    <span className="text-sm font-medium text-neutral-700">
                      Has Warning
                    </span>
                  </label>
                </div>

                {/* Group Category */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Group Category
                  </label>
                  <input
                    type="text"
                    name="groupCategory"
                    value={formData.groupCategory}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter group category"
                    disabled={submitting}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            disabled={submitting}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${submitting || uploading
              ? "bg-neutral-400 cursor-not-allowed"
              : "bg-teal-600 hover:bg-teal-700"
              }`}>
            {submitting
              ? "Saving..."
              : uploading
                ? "Uploading..."
                : isEditMode
                  ? "Update Category"
                  : "Create Category"}
          </button>
        </div>
      </div>
    </div>
  );
}
