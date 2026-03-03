import mongoose from "mongoose";
import Seller from "../models/Seller";

/**
 * Helper function to calculate distance between two coordinates (Haversine formula)
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find sellers whose service radius covers the user's location
 * @param userLat User's latitude
 * @param userLng User's longitude
 * @returns Array of seller IDs within range
 */
export async function findSellersWithinRange(
  userLat: number,
  userLng: number
): Promise<mongoose.Types.ObjectId[]> {
  if (userLat === null || userLng === null || isNaN(userLat) || isNaN(userLng)) {
    return [];
  }

  // Validate coordinates
  if (userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
    return [];
  }

  try {
    // Fetch all approved sellers with location
    const sellers = await Seller.find({
      status: "Approved",
    }).select("_id location serviceRadiusKm latitude longitude category storeName");

    console.log(`[LocationHelper] Checking ${sellers.length} approved sellers for user at [${userLat}, ${userLng}]`);

    // Filter sellers where user is within their service radius
    const nearbySellerIds: mongoose.Types.ObjectId[] = [];

    for (const seller of sellers) {
      let sellerLat: number | null = null;
      let sellerLng: number | null = null;

      // Try GeoJSON first (longitude, latitude)
      if (seller.location && seller.location.coordinates && Array.isArray(seller.location.coordinates) && seller.location.coordinates.length === 2 && (seller.location.coordinates[0] !== 0 || seller.location.coordinates[1] !== 0)) {
        sellerLng = seller.location.coordinates[0];
        sellerLat = seller.location.coordinates[1];
      }
      // Fallback to manual latitude/longitude inside location object
      else if (seller.location && seller.location.latitude && seller.location.longitude && seller.location.latitude !== 0) {
        sellerLat = Number(seller.location.latitude);
        sellerLng = Number(seller.location.longitude);
      }
      // Fallback to legacy top-level fields
      else if ((seller as any).latitude && (seller as any).longitude && parseFloat((seller as any).latitude) !== 0) {
        sellerLat = parseFloat((seller as any).latitude);
        sellerLng = parseFloat((seller as any).longitude);
      }

      // Special handling for Admin: If not found in previous query or status, we should ideally still include it.
      // But we also check if current seller IS an Admin seller.
      const isAdmin = seller.category === "Admin" || (seller.storeName && seller.storeName.toLowerCase().includes("admin"));

      if (isAdmin) {
        console.log(`[LocationHelper] Including Admin store: ${seller.storeName} (${seller._id}) - RADIUS EXEMPT`);
        nearbySellerIds.push(seller._id as mongoose.Types.ObjectId);
        continue;
      }

      if (sellerLat !== null && sellerLng !== null && !isNaN(sellerLat) && !isNaN(sellerLng)) {
        const distance = calculateDistance(
          userLat,
          userLng,
          sellerLat,
          sellerLng
        );
        const serviceRadius = seller.serviceRadiusKm || 10; // Default to 10km if not set

        console.log(`[LocationHelper] Seller: ${seller.storeName}, Dist: ${distance.toFixed(2)}km, Radius: ${serviceRadius}km`);

        if (distance <= serviceRadius) {
          nearbySellerIds.push(seller._id as mongoose.Types.ObjectId);
        }
      } else {
        console.log(`[LocationHelper] Skipping seller ${seller.storeName} (${seller._id}) - No valid location [${sellerLat}, ${sellerLng}]`);
      }
    }

    console.log(`[LocationHelper] Found ${nearbySellerIds.length} nearby sellers: ${nearbySellerIds}`);
    return nearbySellerIds;
  } catch (error) {
    console.error("Error finding nearby sellers:", error);
    return [];
  }
}
