import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import { motion, AnimatePresence } from "framer-motion";

interface Product {
    _id: string;
    id?: string;
    productName: string;
    price: number;
    mainImage?: string;
    subcategoryId?: string;
    subcategory?: string | any;
    [key: string]: any;
}

interface SubCategory {
    _id: string;
    id?: string;
    subcategoryName: string;
    [key: string]: any;
}

interface InlineCategoryFlowProps {
    categoryName: string;
    categoryId: string;
    categorySlug?: string;
    subcategories: SubCategory[];
    products: Product[];
    isLoading: boolean;
}

export default function InlineCategoryFlow({
    categoryName,
    categoryId,
    categorySlug,
    subcategories,
    products,
    isLoading,
}: InlineCategoryFlowProps) {
    const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);

    // Helper to get subcategory ID from product
    const getSubId = (product: any) => {
        const sub = product.subcategory || product.subcategoryId || product.subCategoryId;
        if (!sub) return 'other';
        if (typeof sub === 'object') return sub._id || sub.id || 'other';
        return sub;
    };

    // Group products by subcategory
    const productsBySubcategory = useMemo(() => {
        return products.reduce((acc, product) => {
            let subId = getSubId(product);
            if (subId && typeof subId === 'object') subId = (subId as any).toString();

            if (!acc[subId]) acc[subId] = [];
            acc[subId].push(product);
            return acc;
        }, {} as Record<string, Product[]>);
    }, [products]);

    // Filter subcategories that actually have products
    const activeSubcategories = useMemo(() => {
        return subcategories.filter(sub => {
            const subId = (sub._id || sub.id)?.toString();
            return subId && productsBySubcategory[subId] && productsBySubcategory[subId].length > 0;
        });
    }, [subcategories, productsBySubcategory]);

    // Get products for currently selected subcategory or show all
    const displayProducts = useMemo(() => {
        if (!activeSubcategoryId || activeSubcategoryId === 'all') {
            return products;
        }
        return productsBySubcategory[activeSubcategoryId] || [];
    }, [activeSubcategoryId, productsBySubcategory, products]);

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl mx-2 mt-4 p-8 flex flex-col items-center justify-center shadow-sm border border-neutral-100 min-h-[300px]">
                <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-medium text-neutral-500">Loading {categoryName} content...</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/95 backdrop-blur-sm pt-4 pb-6 mb-4 rounded-2xl mx-2 shadow-sm border border-green-50"
        >
            {/* Removed Category Title and View All link for a cleaner, more interactive UI */}

            {/* Subcategory Tabs - Horizontal scrollable row */}
            {activeSubcategories.length > 0 && (
                <div className="mb-5 px-4 md:px-6 lg:px-8">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {/* Explicit 'All' Tab */}
                        <button
                            onClick={() => setActiveSubcategoryId(null)}
                            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border whitespace-nowrap ${!activeSubcategoryId || activeSubcategoryId === 'all'
                                ? "bg-green-600 text-white border-green-600 shadow-md shadow-green-600/20"
                                : "bg-white text-gray-700 border-gray-200 hover:border-green-300 hover:bg-green-50"
                                }`}
                        >
                            All
                            <span className={`ml-1.5 text-xs ${!activeSubcategoryId || activeSubcategoryId === 'all' ? "text-green-100" : "text-gray-400"}`}>
                                ({products.length})
                            </span>
                        </button>

                        {activeSubcategories.map((subcat) => {
                            const subId = (subcat._id || subcat.id)?.toString();
                            const isActive = activeSubcategoryId === subId;
                            const productCount = subId ? (productsBySubcategory[subId]?.length || 0) : 0;

                            return (
                                <button
                                    key={subId}
                                    onClick={() => setActiveSubcategoryId(subId || null)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border whitespace-nowrap ${isActive
                                        ? "bg-green-600 text-white border-green-600 shadow-md shadow-green-600/20"
                                        : "bg-white text-gray-700 border-gray-200 hover:border-green-300 hover:bg-green-50"
                                        }`}
                                >
                                    {subcat.subcategoryName || subcat.name}
                                    {productCount > 0 && (
                                        <span className={`ml-1.5 text-xs ${isActive ? "text-green-100" : "text-gray-400"}`}>
                                            ({productCount})
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Products Grid for selected subcategory */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSubcategoryId || "all"}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 md:px-6 lg:px-8"
                >
                    {displayProducts.length > 0 ? (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
                            {displayProducts.map((product: Product) => (
                                <ProductCard
                                    key={product.id || product._id}
                                    product={product as any}
                                    categoryStyle={true}
                                    showBadge={true}
                                    showPackBadge={false}
                                    showStockInfo={false}
                                    compact={true}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-10 text-center">
                            <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <p className="text-neutral-500 font-medium">No products available</p>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Only show "No products" if truly empty */}
            {products.length === 0 && !isLoading && (
                <div className="px-4 md:px-6 lg:px-8 py-10 text-center">
                    <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <p className="text-neutral-500 font-medium">Coming Soon...</p>
                </div>
            )}
        </motion.div>
    );
}
