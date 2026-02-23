import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { uploadImage, uploadImages } from "../../../services/api/uploadService";
import {
  validateImageFile,
  createImagePreview,
} from "../../../utils/imageUpload";
import {
  createProduct,
  updateProduct,
  getProductById,
  getShops,
  ProductVariation,
  Shop,
} from "../../../services/api/productService";
import {
  getCategories,
  getSubcategories,
  Category,
  SubCategory,
} from "../../../services/api/categoryService";
import { getActiveTaxes, Tax } from "../../../services/api/taxService";
import { getBrands, Brand } from "../../../services/api/brandService";

// ─── Weight Variant Presets ───────────────────────────────────────────────────
const WEIGHT_PRESETS = [
  { label: "1 KG", grams: 1000 },
  { label: "500 GM", grams: 500 },
  { label: "250 GM", grams: 250 },
  { label: "100 GM", grams: 100 },
];

interface WeightVariant {
  label: string;
  grams: number;
  price: number;
  mrp: number;
  stock: number;
  isEnabled: boolean;
}

function buildDefaultWeightVariants(pricePerKg: number): WeightVariant[] {
  return WEIGHT_PRESETS.map(({ label, grams }) => ({
    label,
    grams,
    price: pricePerKg > 0 ? Math.round((pricePerKg * grams) / 1000) : 0,
    mrp: 0,
    stock: 0,
    isEnabled: true,
  }));
}

export default function SellerAddProduct() {
  const navigate = useNavigate();
  const { id } = useParams();

  // ── Selling unit mode ──────────────────────────────────────────────────────
  const [sellingUnit, setSellingUnit] = useState<"weight" | "quantity">("quantity");
  const [pricePerKg, setPricePerKg] = useState<string>("");
  const [weightVariants, setWeightVariants] = useState<WeightVariant[]>(
    buildDefaultWeightVariants(0)
  );

  const totalWeightStock = weightVariants
    .filter((v) => v.isEnabled)
    .reduce((sum, v) => sum + (v.stock || 0), 0);

  const handlePricePerKgChange = (val: string) => {
    setPricePerKg(val);
    const pkgNum = parseFloat(val) || 0;
    setWeightVariants((prev) =>
      prev.map((v) => ({
        ...v,
        price: pkgNum > 0 ? Math.round((pkgNum * v.grams) / 1000) : v.price,
      }))
    );
  };

  const updateWeightVariant = (idx: number, field: keyof WeightVariant, val: any) => {
    setWeightVariants((prev) => {
      const next = [...prev];
      (next[idx] as any)[field] = val;
      return next;
    });
  };

  // ── General form state ─────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    productName: "",
    category: "",
    subcategory: "",
    publish: "No",
    popular: "No",
    dealOfDay: "No",
    brand: "",
    tags: "",
    smallDescription: "",
    seoTitle: "",
    seoKeywords: "",
    seoImageAlt: "",
    seoDescription: "",
    variationType: "",
    manufacturer: "",
    madeIn: "",
    tax: "",
    isReturnable: "No",
    maxReturnDays: "",
    fssaiLicNo: "",
    totalAllowedQuantity: "10",
    mainImageUrl: "",
    galleryImageUrls: [] as string[],
    isShopByStoreOnly: "No",
    shopId: "",
  });

  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [variationForm, setVariationForm] = useState({
    title: "",
    price: "",
    discPrice: "0",
    stock: "0",
    status: "Available" as "Available" | "Sold out",
  });

  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string>("");
  const [galleryImageFiles, setGalleryImageFiles] = useState<File[]>([]);
  const [galleryImagePreviews, setGalleryImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          getCategories(),
          getActiveTaxes(),
          getBrands(),
          getShops(),
        ]);
        if (results[0].status === "fulfilled" && results[0].value.success) setCategories(results[0].value.data);
        if (results[1].status === "fulfilled" && results[1].value.success) setTaxes(results[1].value.data);
        if (results[2].status === "fulfilled" && results[2].value.success) setBrands(results[2].value.data);
        if (results[3].status === "fulfilled" && results[3].value.success) setShops(results[3].value.data);
      } catch (err) {
        console.error("Error fetching form data:", err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        try {
          const response = await getProductById(id);
          if (response.success && response.data) {
            const product = response.data;
            setFormData({
              productName: product.productName,
              category: (product.category as any)?._id || product.categoryId || "",
              subcategory: (product.subcategory as any)?._id || product.subcategoryId || "",
              publish: product.publish ? "Yes" : "No",
              popular: product.popular ? "Yes" : "No",
              dealOfDay: product.dealOfDay ? "Yes" : "No",
              brand: (product.brand as any)?._id || product.brandId || "",
              tags: product.tags.join(", "),
              smallDescription: product.smallDescription || "",
              seoTitle: product.seoTitle || "",
              seoKeywords: product.seoKeywords || "",
              seoImageAlt: product.seoImageAlt || "",
              seoDescription: product.seoDescription || "",
              variationType: product.variationType || "",
              manufacturer: product.manufacturer || "",
              madeIn: product.madeIn || "",
              tax: (product.tax as any)?._id || product.taxId || "",
              isReturnable: product.isReturnable ? "Yes" : "No",
              maxReturnDays: product.maxReturnDays?.toString() || "",
              fssaiLicNo: product.fssaiLicNo || "",
              totalAllowedQuantity: product.totalAllowedQuantity?.toString() || "10",
              mainImageUrl: product.mainImageUrl || product.mainImage || "",
              galleryImageUrls: product.galleryImageUrls || [],
              isShopByStoreOnly: (product as any).isShopByStoreOnly ? "Yes" : "No",
              shopId: (product as any).shopId?._id || (product as any).shopId || "",
            });
            const su = (product as any).sellingUnit || "quantity";
            setSellingUnit(su);
            if (su === "weight") {
              setPricePerKg(String((product as any).pricePerKg || ""));
              if ((product as any).weightVariants?.length) setWeightVariants((product as any).weightVariants);
            } else {
              setVariations(product.variations || []);
            }
            if (product.mainImageUrl || product.mainImage) setMainImagePreview(product.mainImageUrl || product.mainImage || "");
            if (product.galleryImageUrls) setGalleryImagePreviews(product.galleryImageUrls);
          }
        } catch (err) {
          console.error("Error fetching product:", err);
          setUploadError("Failed to fetch product details");
        }
      };
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    if (formData.category) {
      getSubcategories(formData.category)
        .then((res) => { if (res.success) setSubcategories(res.data); })
        .catch(console.error);
    } else {
      setSubcategories([]);
      setFormData((prev) => ({ ...prev, subcategory: "" }));
    }
  }, [formData.category]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMainImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const v = validateImageFile(file);
    if (!v.valid) { setUploadError(v.error || "Invalid file"); return; }
    setMainImageFile(file);
    setUploadError("");
    try { setMainImagePreview(await createImagePreview(file)); }
    catch { setUploadError("Failed to create preview"); }
  };

  const handleGalleryImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (files.some((f) => !validateImageFile(f).valid)) { setUploadError("Some files are invalid."); return; }
    setGalleryImageFiles(files);
    setUploadError("");
    try { setGalleryImagePreviews(await Promise.all(files.map(createImagePreview))); }
    catch { setUploadError("Failed to create previews"); }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImageFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const addVariation = () => {
    if (!variationForm.title || !variationForm.price) { setUploadError("Fill in variation title and price"); return; }
    const price = parseFloat(variationForm.price);
    const discPrice = parseFloat(variationForm.discPrice || "0");
    const stock = parseInt(variationForm.stock || "0");
    if (discPrice > price) { setUploadError("Discounted price cannot exceed sale price"); return; }
    setVariations([...variations, { title: variationForm.title, price, discPrice, stock, status: variationForm.status }]);
    setVariationForm({ title: "", price: "", discPrice: "0", stock: "0", status: "Available" });
    setUploadError("");
  };

  const removeVariation = (index: number) => setVariations((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");
    if (!formData.productName.trim()) { setUploadError("Please enter a product name."); return; }
    if (formData.isShopByStoreOnly !== "Yes" && !formData.category) { setUploadError("Please select a category."); return; }
    if (sellingUnit === "weight") {
      const enabled = weightVariants.filter((v) => v.isEnabled);
      if (!enabled.length) { setUploadError("Enable at least one weight variant."); return; }
    } else {
      if (!variations.length) { setUploadError("Please add at least one product variation."); return; }
    }

    setUploading(true);
    try {
      let mainImageUrl = formData.mainImageUrl;
      let galleryImageUrls = [...formData.galleryImageUrls];
      if (mainImageFile) {
        const res = await uploadImage(mainImageFile, "mandibazaar/products");
        mainImageUrl = res.secureUrl;
        setFormData((prev) => ({ ...prev, mainImageUrl }));
      }
      if (galleryImageFiles.length > 0) {
        const res = await uploadImages(galleryImageFiles, "mandibazaar/products/gallery");
        galleryImageUrls = res.map((r) => r.secureUrl);
        setFormData((prev) => ({ ...prev, galleryImageUrls }));
      }

      const tagsArray = formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

      const productData: any = {
        productName: formData.productName,
        categoryId: formData.category || undefined,
        subcategoryId: formData.subcategory || undefined,
        brandId: formData.brand || undefined,
        publish: formData.publish === "Yes",
        popular: formData.popular === "Yes",
        dealOfDay: formData.dealOfDay === "Yes",
        seoTitle: formData.seoTitle || undefined,
        seoKeywords: formData.seoKeywords || undefined,
        seoImageAlt: formData.seoImageAlt || undefined,
        seoDescription: formData.seoDescription || undefined,
        smallDescription: formData.smallDescription || undefined,
        tags: tagsArray,
        manufacturer: formData.manufacturer || undefined,
        madeIn: formData.madeIn || undefined,
        taxId: formData.tax || undefined,
        isReturnable: formData.isReturnable === "Yes",
        maxReturnDays: formData.maxReturnDays ? parseInt(formData.maxReturnDays) : undefined,
        totalAllowedQuantity: parseInt(formData.totalAllowedQuantity || "10"),
        fssaiLicNo: formData.fssaiLicNo || undefined,
        mainImageUrl: mainImageUrl || undefined,
        galleryImageUrls,
        isShopByStoreOnly: formData.isShopByStoreOnly === "Yes",
        shopId: formData.isShopByStoreOnly === "Yes" && formData.shopId ? formData.shopId : undefined,
        sellingUnit,
        ...(sellingUnit === "weight"
          ? { pricePerKg: parseFloat(pricePerKg) || 0, weightVariants, variations: [] }
          : { variations, variationType: formData.variationType || undefined }),
      };

      const response = id ? await updateProduct(id, productData) : await createProduct(productData);
      if (response.success) {
        setSuccessMessage(id ? "Product updated successfully!" : "Product added successfully!");
        setTimeout(() => {
          setSuccessMessage("");
          const base = window.location.pathname.startsWith("/admin") ? "/admin" : "/seller";
          navigate(`${base}/product/list`);
        }, 1500);
      } else {
        setUploadError(response.message || "Failed to save product");
      }
    } catch (error: any) {
      setUploadError(error.response?.data?.message || error.message || "Failed to upload images.");
    } finally {
      setUploading(false);
    }
  };

  const inputCls = "w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500";
  const selectCls = `${inputCls} bg-white`;
  const sectionHead = "bg-teal-600 text-white px-4 sm:px-6 py-3";

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Product Basic Info ──────────────────────────────────────── */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <div className={sectionHead}><h2 className="text-lg font-semibold">Product</h2></div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Product Name <span className="text-red-500">*</span></label>
                  <input type="text" name="productName" value={formData.productName} onChange={handleChange} placeholder="Enter Product Name" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Select Category</label>
                  <select name="category" value={formData.category} onChange={handleChange} className={selectCls}>
                    <option value="">Select Category</option>
                    {categories.map((cat: any) => (
                      <option key={cat._id || cat.id} value={cat._id || cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Select SubCategory {!formData.category && <span className="text-xs text-neutral-400 ml-1">(Select category first)</span>}
                  </label>
                  <select name="subcategory" value={formData.subcategory} onChange={handleChange} disabled={!formData.category}
                    className={`${selectCls} ${!formData.category ? "bg-neutral-100 cursor-not-allowed text-neutral-400" : ""}`}>
                    <option value="">{formData.category ? "Select Subcategory (Optional)" : "Select Category First"}</option>
                    {subcategories.map((sub: any) => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Publish?</label>
                  <select name="publish" value={formData.publish} onChange={handleChange} className={selectCls}>
                    <option value="No">No</option><option value="Yes">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Make Popular?</label>
                  <select name="popular" value={formData.popular} onChange={handleChange} className={selectCls}>
                    <option value="No">No</option><option value="Yes">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Deal of the Day?</label>
                  <select name="dealOfDay" value={formData.dealOfDay} onChange={handleChange} className={selectCls}>
                    <option value="No">No</option><option value="Yes">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Select Brand</label>
                  <select name="brand" value={formData.brand} onChange={handleChange} className={selectCls}>
                    <option value="">Select Brand</option>
                    {brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Tags</label>
                  <input type="text" name="tags" value={formData.tags} onChange={handleChange} placeholder="fresh, organic, local" className={inputCls} />
                  <p className="text-xs text-neutral-500 mt-1">Comma separated — helps search</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Short Description</label>
                <textarea name="smallDescription" value={formData.smallDescription} onChange={handleChange}
                  placeholder="Enter a short product description" rows={3} className={`${inputCls} resize-none`} />
              </div>
            </div>
          </div>

          {/* ── Pricing & Stock ──────────────────────────────────────────── */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 sm:px-6 py-3">
              <h2 className="text-lg font-semibold">💰 Pricing &amp; Stock</h2>
            </div>
            <div className="p-4 sm:p-6 space-y-6">

              {/* Mode Selector */}
              <div>
                <p className="text-sm font-semibold text-neutral-700 mb-3">How is this product sold?</p>
                <div className="flex gap-3">
                  {[
                    { mode: "weight" as const, emoji: "⚖️", label: "By Weight", sub: "KG / GM variants" },
                    { mode: "quantity" as const, emoji: "📦", label: "By Quantity", sub: "per unit / piece" },
                  ].map(({ mode, emoji, label, sub }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSellingUnit(mode)}
                      className={`flex-1 flex flex-col items-center gap-1 py-4 px-3 rounded-xl border-2 font-semibold text-sm transition-all max-w-[180px] ${sellingUnit === mode
                        ? "border-teal-600 bg-teal-50 text-teal-700 shadow"
                        : "border-neutral-200 text-neutral-500 hover:border-teal-300 hover:bg-neutral-50"
                        }`}
                    >
                      <span className="text-3xl">{emoji}</span>
                      <span>{label}</span>
                      <span className="text-[11px] font-normal text-neutral-400">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── WEIGHT MODE ─────────────────────────────────────────── */}
              {sellingUnit === "weight" && (
                <div className="space-y-5">
                  <div className="max-w-xs">
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">
                      Base Price per 1 KG <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        value={pricePerKg}
                        onChange={(e) => handlePricePerKgChange(e.target.value)}
                        placeholder="e.g. 80"
                        className="w-full pl-8 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-base"
                      />
                    </div>
                    <p className="text-xs text-neutral-400 mt-1.5">Variant prices auto-calculated. You can override each one below.</p>
                  </div>

                  {/* Variants Table */}
                  <div>
                    <p className="text-sm font-semibold text-neutral-700 mb-2">Weight Variants</p>
                    <div className="rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                      {/* Header */}
                      <div className="grid gap-2 bg-neutral-50 border-b border-neutral-200 px-4 py-2.5 text-xs font-bold text-neutral-400 uppercase tracking-wider"
                        style={{ gridTemplateColumns: "40px 80px 1fr 1fr 1fr" }}>
                        <div>On</div>
                        <div>Size</div>
                        <div>Sale Price (₹)</div>
                        <div>MRP (₹)</div>
                        <div>Stock (units)</div>
                      </div>

                      {weightVariants.map((v, idx) => (
                        <div
                          key={v.label}
                          className={`grid gap-2 items-center px-4 py-3 border-b border-neutral-100 last:border-none ${v.isEnabled ? "bg-white" : "bg-neutral-50"}`}
                          style={{ gridTemplateColumns: "40px 80px 1fr 1fr 1fr" }}
                        >
                          {/* Toggle */}
                          <div>
                            <button
                              type="button"
                              onClick={() => updateWeightVariant(idx, "isEnabled", !v.isEnabled)}
                              className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${v.isEnabled ? "bg-teal-500" : "bg-neutral-300"}`}
                            >
                              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${v.isEnabled ? "translate-x-5" : "translate-x-1"}`} />
                            </button>
                          </div>

                          {/* Label Badge */}
                          <div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${v.isEnabled ? "bg-teal-100 text-teal-700" : "bg-neutral-200 text-neutral-400"}`}>
                              {v.label}
                            </span>
                          </div>

                          {/* Price */}
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-semibold">₹</span>
                            <input
                              type="number" value={v.price || ""} disabled={!v.isEnabled}
                              onChange={(e) => updateWeightVariant(idx, "price", parseFloat(e.target.value) || 0)}
                              className="w-full pl-6 pr-2 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-neutral-100 disabled:cursor-not-allowed"
                              placeholder="0"
                            />
                          </div>

                          {/* MRP */}
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-semibold">₹</span>
                            <input
                              type="number" value={v.mrp || ""} disabled={!v.isEnabled}
                              onChange={(e) => updateWeightVariant(idx, "mrp", parseFloat(e.target.value) || 0)}
                              className="w-full pl-6 pr-2 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-neutral-100 disabled:cursor-not-allowed"
                              placeholder="0"
                            />
                          </div>

                          {/* Stock */}
                          <div>
                            <input
                              type="number" value={v.stock || ""} disabled={!v.isEnabled}
                              onChange={(e) => updateWeightVariant(idx, "stock", parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-neutral-100 disabled:cursor-not-allowed"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total Stock */}
                    <div className="mt-3 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <span className="text-sm font-semibold text-emerald-700">Total Available Stock:</span>
                      <span className="text-2xl font-black text-emerald-600">{totalWeightStock}</span>
                      <span className="text-xs text-emerald-500">units (enabled variants only)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── QUANTITY MODE ────────────────────────────────────────── */}
              {sellingUnit === "quantity" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Variation Type</label>
                    <select name="variationType" value={formData.variationType} onChange={handleChange} className={`${selectCls} max-w-xs`}>
                      <option value="">Select Type (Optional)</option>
                      <option value="Size">Size</option>
                      <option value="Weight">Weight</option>
                      <option value="Color">Color</option>
                      <option value="Pack">Pack</option>
                    </select>
                  </div>

                  {/* Add Variation Row */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Title <span className="text-red-500">*</span></label>
                      <input type="text" value={variationForm.title}
                        onChange={(e) => setVariationForm({ ...variationForm, title: e.target.value })}
                        placeholder="e.g. 500g" className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Sale Price (₹) <span className="text-red-500">*</span></label>
                      <input type="number" value={variationForm.price}
                        onChange={(e) => setVariationForm({ ...variationForm, price: e.target.value })}
                        placeholder="100" className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1.5">MRP (₹)</label>
                      <input type="number" value={variationForm.discPrice}
                        onChange={(e) => setVariationForm({ ...variationForm, discPrice: e.target.value })}
                        placeholder="120" className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Stock</label>
                      <input type="number" value={variationForm.stock}
                        onChange={(e) => setVariationForm({ ...variationForm, stock: e.target.value })}
                        placeholder="0" className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div className="flex items-end">
                      <button type="button" onClick={addVariation}
                        className="w-full px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-sm transition-colors">
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Variations Table */}
                  {variations.length > 0 && (
                    <div className="rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                      <div className="grid gap-2 bg-neutral-50 border-b border-neutral-200 px-4 py-2.5 text-xs font-bold text-neutral-400 uppercase tracking-wider"
                        style={{ gridTemplateColumns: "1fr 1fr 1fr 80px 40px" }}>
                        <div>Title</div>
                        <div>Sale Price</div>
                        <div>MRP</div>
                        <div>Stock</div>
                        <div></div>
                      </div>
                      {variations.map((v, idx) => (
                        <div key={idx} className="grid gap-2 items-center px-4 py-3 border-b border-neutral-100 last:border-none text-sm bg-white"
                          style={{ gridTemplateColumns: "1fr 1fr 1fr 80px 40px" }}>
                          <div className="font-semibold text-neutral-800">{v.title}</div>
                          <div className="font-bold text-teal-700">₹{v.price}</div>
                          <div className="text-neutral-400">{v.discPrice > 0 ? `₹${v.discPrice}` : "—"}</div>
                          <div className="text-neutral-600">{v.stock === 0 ? "∞" : v.stock}</div>
                          <div>
                            <button type="button" onClick={() => removeVariation(idx)}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 text-lg leading-none font-bold">
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100 flex items-center gap-3">
                        <span className="text-sm font-semibold text-emerald-700">Total Stock:</span>
                        <span className="text-xl font-black text-emerald-600">
                          {variations.reduce((s, v) => s + (v.stock || 0), 0)}
                        </span>
                        <span className="text-xs text-emerald-500">units across all variants</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── SEO ────────────────────────────────────────────────── */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <div className={sectionHead}><h2 className="text-lg font-semibold">SEO Content</h2></div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">SEO Title</label>
                  <input type="text" name="seoTitle" value={formData.seoTitle} onChange={handleChange} placeholder="SEO Title" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">SEO Keywords</label>
                  <input type="text" name="seoKeywords" value={formData.seoKeywords} onChange={handleChange} placeholder="keyword1, keyword2" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Image Alt Text</label>
                  <input type="text" name="seoImageAlt" value={formData.seoImageAlt} onChange={handleChange} placeholder="Image description" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">SEO Description</label>
                <textarea name="seoDescription" value={formData.seoDescription} onChange={handleChange} placeholder="Meta description" rows={3} className={`${inputCls} resize-none`} />
              </div>
            </div>
          </div>

          {/* ── Other Details ─────────────────────────────────────── */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <div className={sectionHead}><h2 className="text-lg font-semibold">Other Details</h2></div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Manufacturer</label>
                  <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange} placeholder="Manufacturer name" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Made In</label>
                  <input type="text" name="madeIn" value={formData.madeIn} onChange={handleChange} placeholder="Country / City" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Select Tax</label>
                  <select name="tax" value={formData.tax} onChange={handleChange} className={selectCls}>
                    <option value="">Select Tax</option>
                    {taxes.map((t) => <option key={t._id} value={t._id}>{t.name} ({t.percentage}%)</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Is Returnable?</label>
                  <select name="isReturnable" value={formData.isReturnable} onChange={handleChange} className={selectCls}>
                    <option value="No">No</option><option value="Yes">Yes</option>
                  </select>
                </div>
                {formData.isReturnable === "Yes" && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Max Return Days</label>
                    <input type="number" name="maxReturnDays" value={formData.maxReturnDays} onChange={handleChange} placeholder="7" className={inputCls} />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">FSSAI Lic. No.</label>
                  <input type="text" name="fssaiLicNo" value={formData.fssaiLicNo} onChange={handleChange} placeholder="FSSAI License Number" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Max Qty per Order</label>
                  <input type="number" name="totalAllowedQuantity" value={formData.totalAllowedQuantity} onChange={handleChange} placeholder="10" className={inputCls} />
                  <p className="text-xs text-neutral-400 mt-1">Leave 10 if no limit</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Images ──────────────────────────────────────────────── */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <div className={sectionHead}><h2 className="text-lg font-semibold">Product Images</h2></div>
            <div className="p-4 sm:p-6 space-y-6">
              {uploadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{uploadError}</div>
              )}
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{successMessage}</div>
              )}
              {/* Main Image */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Main Image <span className="text-red-500">*</span></label>
                <label className="block border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center hover:border-teal-500 transition-colors cursor-pointer">
                  {mainImagePreview ? (
                    <div className="space-y-2">
                      <img src={mainImagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-cover" />
                      <p className="text-sm text-neutral-500">{mainImageFile?.name}</p>
                      <button type="button" onClick={(e) => { e.preventDefault(); setMainImageFile(null); setMainImagePreview(""); }}
                        className="text-sm text-red-500 hover:text-red-700 font-medium">Remove</button>
                    </div>
                  ) : (
                    <div className="text-neutral-400">
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <p className="text-sm font-medium text-neutral-600">Click to upload main image</p>
                      <p className="text-xs mt-1">JPG · PNG · WEBP · Max 5MB</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleMainImageChange} className="hidden" disabled={uploading} />
                </label>
              </div>

              {/* Gallery */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Gallery Images <span className="text-neutral-400 text-xs">(Optional)</span></label>
                <label className="block border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center hover:border-teal-500 transition-colors cursor-pointer">
                  {galleryImagePreviews.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {galleryImagePreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img src={preview} alt={`Gallery ${index + 1}`} className="w-full h-28 object-cover rounded-lg" />
                            <button type="button" onClick={(e) => { e.preventDefault(); removeGalleryImage(index); }}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 text-xs font-bold">
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-neutral-500">{galleryImageFiles.length} image(s) selected</p>
                    </div>
                  ) : (
                    <div className="text-neutral-400">
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <p className="text-sm font-medium text-neutral-600">Upload additional images</p>
                      <p className="text-xs mt-1">Up to 10 images · Max 5MB each</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" multiple onChange={handleGalleryImagesChange} className="hidden" disabled={uploading} />
                </label>
              </div>
            </div>
          </div>

          {/* ── Shop by Store ─────────────────────────────────────── */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <div className={sectionHead}><h2 className="text-lg font-semibold">Shop by Store</h2></div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> "Shop by Store only" products won't appear on category pages or homepage.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Show in Shop by Store only?</label>
                  <select name="isShopByStoreOnly" value={formData.isShopByStoreOnly} onChange={handleChange} className={selectCls}>
                    <option value="No">No</option><option value="Yes">Yes</option>
                  </select>
                </div>
                {formData.isShopByStoreOnly === "Yes" && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Select Store <span className="text-red-500">*</span></label>
                    <select name="shopId" value={formData.shopId} onChange={handleChange} required className={selectCls}>
                      <option value="">Select Store</option>
                      {shops.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                    {!shops.length && <p className="text-xs text-neutral-400 mt-1">No active stores available.</p>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Submit ──────────────────────────────────────────────── */}
          <div className="flex justify-end pb-8">
            <button
              type="submit"
              disabled={uploading}
              className={`px-10 py-3.5 rounded-xl font-bold text-base transition-all shadow-md ${uploading
                ? "bg-neutral-300 cursor-not-allowed text-neutral-500"
                : "bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white"
                }`}
            >
              {uploading ? "⏳ Saving…" : id ? "✓ Update Product" : "✓ Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
