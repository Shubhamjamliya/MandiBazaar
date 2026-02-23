import api from "../config";

export interface Banner {
  _id: string;
  image: string;
  link: string;
  title: string;
  type: 'carousel' | 'banner-1' | 'banner-3';
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BannerResponse {
  success: boolean;
  message?: string;
  data: Banner;
}

export interface BannersResponse {
  success: boolean;
  message?: string;
  data: Banner[];
}

export const getAllBanners = async (): Promise<BannersResponse> => {
  const response = await api.get<BannersResponse>("/admin/banners");
  return response.data;
};

export const getBannerById = async (id: string): Promise<BannerResponse> => {
  const response = await api.get<BannerResponse>(`/admin/banners/${id}`);
  return response.data;
};

export const createBanner = async (data: Partial<Banner>): Promise<BannerResponse> => {
  const response = await api.post<BannerResponse>("/admin/banners", data);
  return response.data;
};

export const updateBanner = async (id: string, data: Partial<Banner>): Promise<BannerResponse> => {
  const response = await api.put<BannerResponse>(`/admin/banners/${id}`, data);
  return response.data;
};

export const deleteBanner = async (id: string): Promise<BannerResponse> => {
  const response = await api.delete<BannerResponse>(`/admin/banners/${id}`);
  return response.data;
};

export const reorderBanners = async (banners: { id: string; order: number }[]): Promise<BannersResponse> => {
  const response = await api.put<BannersResponse>("/admin/banners/reorder", { banners });
  return response.data;
};
