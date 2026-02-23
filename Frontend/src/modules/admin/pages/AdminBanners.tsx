import { useState, useEffect } from "react";
import { uploadImage } from "../../../services/api/uploadService";
import { validateImageFile, createImagePreview } from "../../../utils/imageUpload";
import {
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  type Banner,
} from "../../../services/api/admin/adminBannerService";

export default function AdminBanners() {
  // Form state
  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<'carousel' | 'banner-1' | 'banner-3'>('carousel');
  const [order, setOrder] = useState<number | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);

  // Data state
  const [banners, setBanners] = useState<Banner[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Pagination
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch initial data
  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoadingBanners(true);
      const response = await getAllBanners();
      if (response.success && Array.isArray(response.data)) {
        setBanners(response.data);
      }
    } catch (err) {
      console.error("Error fetching banners:", err);
      setError("Failed to load banners");
    } finally {
      setLoadingBanners(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid image file");
      return;
    }

    setImageFile(file);
    setError("");

    try {
      const preview = await createImagePreview(file);
      setImagePreview(preview);
    } catch (error) {
      setError("Failed to create image preview");
    }
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    // Validation
    if (!image && !imageFile) {
      setError("Please provide an image URL or upload a file");
      return;
    }

    try {
      setLoading(true);
      let finalImageUrl = image;

      // Handle file upload if present
      if (imageFile) {
        setUploading(true);
        try {
          const uploadResult = await uploadImage(imageFile, "mandibazaar/banners");
          finalImageUrl = uploadResult.secureUrl;
        } catch (err: any) {
          setError(err.message || "Failed to upload image");
          setUploading(false);
          setLoading(false);
          return;
        }
        setUploading(false);
      }

      const formData: any = {
        image: finalImageUrl,
        link,
        title,
        type,
        order: order !== undefined ? order : 0,
        isActive,
      };

      if (editingId) {
        const response = await updateBanner(editingId, formData);
        if (response.success) {
          setSuccess("Banner updated successfully!");
          resetForm();
          fetchBanners();
        } else {
          setError(response.message || "Failed to update banner");
        }
      } else {
        const response = await createBanner(formData);
        if (response.success) {
          setSuccess("Banner created successfully!");
          resetForm();
          fetchBanners();
        } else {
          setError(response.message || "Failed to create banner");
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save banner");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (banner: Banner) => {
    setImage(banner.image);
    setImageFile(null);
    setImagePreview("");
    setLink(banner.link || "");
    setTitle(banner.title || "");
    setType(banner.type || 'carousel');
    setOrder(banner.order);
    setIsActive(banner.isActive);
    setEditingId(banner._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this banner?")) {
      return;
    }

    try {
      const response = await deleteBanner(id);
      if (response.success) {
        setSuccess("Banner deleted successfully!");
        fetchBanners();
        if (editingId === id) {
          resetForm();
        }
      } else {
        setError(response.message || "Failed to delete banner");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete banner");
    }
  };

  const resetForm = () => {
    setImage("");
    setImageFile(null);
    setImagePreview("");
    setLink("");
    setTitle("");
    setType('carousel');
    setOrder(undefined);
    setIsActive(true);
    setEditingId(null);
  };

  // Pagination
  const totalPages = Math.ceil(banners.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const displayedBanners = banners.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6 min-h-screen">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Banner Management</h1>
          <p className="text-sm text-neutral-500 mt-1">Configure carousel and static banners for the homepage</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <span className="hover:text-teal-600 cursor-pointer">Dashboard</span>
          <span>/</span>
          <span className="text-neutral-800 font-medium">Banners</span>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess("")}>✕</button>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError("")}>✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="bg-teal-600 p-4">
              <h2 className="text-lg font-semibold text-white">{editingId ? "Edit Banner" : "New Banner"}</h2>
            </div>
            <div className="p-6 space-y-5">
              {/* Banner Type */}
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2">Banner Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['carousel', 'banner-1', 'banner-3'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${type === t
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-teal-300'
                        }`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Upload Area */}
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2">Upload Image</label>
                <div
                  onClick={() => document.getElementById('file-input')?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${imagePreview || image ? 'border-teal-500 bg-teal-50/20' : 'border-neutral-300 hover:border-teal-400'
                    }`}
                >
                  {imagePreview || image ? (
                    <div className="relative group">
                      <img src={imagePreview || image} alt="Preview" className="w-full h-24 object-cover rounded-lg" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-lg">
                        <span className="text-white text-xs font-bold underline">Change Image</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2">
                      <svg className="w-8 h-8 mx-auto mb-2 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="text-xs font-medium text-neutral-500 text-center">Click to upload image</p>
                    </div>
                  )}
                  <input type="file" id="file-input" className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                {!imageFile && !editingId && (
                  <div className="mt-2">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold text-center">Or use URL</p>
                    <input
                      type="text"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="Paste image URL here..."
                      className="w-full mt-1 text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">Banner Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter banner title"
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                />
              </div>

              {/* Redirect URL */}
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">Redirect to (Link)</label>
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="/category/organic"
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                />
              </div>

              {/* Order */}
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">Display Order</label>
                <input
                  type="number"
                  value={order === undefined ? "" : order}
                  onChange={(e) => setOrder(e.target.value === "" ? undefined : parseInt(e.target.value))}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={loading || uploading}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 disabled:bg-neutral-300"
                >
                  {loading ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Banner" : "Create Banner")}
                </button>
                {editingId && (
                  <button onClick={resetForm} className="px-5 py-3 bg-neutral-100 text-neutral-600 font-bold rounded-xl hover:bg-neutral-200 transition-all">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="bg-neutral-800 p-4 px-6 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Active Banners</h2>
              <div className="flex bg-neutral-700 rounded-lg p-0.5">
                {/* Quick filter tabs could go here */}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-neutral-50 border-b">
                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Image</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Order</th>
                    <th className="px-10 py-4 text-right text-xs font-bold text-neutral-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {loadingBanners ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-neutral-400 italic">Loading your banners...</td>
                    </tr>
                  ) : displayedBanners.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-neutral-400 italic">No banners found. Start by creating one!</td>
                    </tr>
                  ) : (
                    displayedBanners.map((banner) => (
                      <tr key={banner._id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <img src={banner.image} alt={banner.title} className="w-24 h-12 object-cover rounded shadow-sm border border-neutral-200" />
                        </td>
                        <td className="px-6 py-4 text-xs font-bold">
                          <span className={`px-2 py-1 rounded inline-block ${banner.type === 'carousel' || !banner.type ? 'bg-blue-50 text-blue-600' :
                              banner.type === 'banner-1' ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'
                            }`}>
                            {(banner.type || 'carousel').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-700 font-medium">{banner.title}</td>
                        <td className="px-6 py-4 text-sm font-bold text-neutral-500">{banner.order}</td>
                        <td className="px-12 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleEdit(banner)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onClick={() => handleDelete(banner._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loadingBanners && banners.length > rowsPerPage && (
              <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-between items-center text-sm">
                <div className="text-neutral-500">
                  Showing <span className="font-bold text-neutral-700">{startIndex + 1}</span> to <span className="font-bold text-neutral-700">{Math.min(endIndex, banners.length)}</span> of <span className="font-bold text-neutral-700">{banners.length}</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-neutral-300 rounded-lg disabled:opacity-50 hover:bg-white transition-colors disabled:hover:bg-transparent font-medium"
                  >
                    Prev
                  </button>
                  <div className="flex gap-1 items-center px-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors font-bold ${currentPage === i + 1 ? "bg-teal-600 text-white" : "text-neutral-600 hover:bg-white border border-transparent hover:border-neutral-200"
                          }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-neutral-300 rounded-lg disabled:opacity-50 hover:bg-white transition-colors disabled:hover:bg-transparent font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
