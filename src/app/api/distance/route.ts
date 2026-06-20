import { NextRequest, NextResponse } from 'next/server';

const SHOP_LAT = parseFloat(process.env.SHOP_LATITUDE || '22.5443');
const SHOP_LNG = parseFloat(process.env.SHOP_LONGITUDE || '88.3249');
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Distance thresholds (in kilometers)
const LOCAL_RADIUS_KM = 13;    // within 13km → local pricing
const LOCAL_MIN_ORDER = 1000;
const DEFAULT_MIN_ORDER = 2500;

export async function POST(req: NextRequest) {
  try {
    const { lat, lng, address } = await req.json();

    let targetLat = lat;
    let targetLng = lng;

    // If address is provided instead of lat/lng, geocode it (optional)
    if (address && !lat) {
      // You can add geocoding here if needed
      // For now, we require lat/lng
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    if (!targetLat || !targetLng) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Calculate straight‑line distance (Haversine formula)
    const distance = calculateDistance(SHOP_LAT, SHOP_LNG, targetLat, targetLng);

    // Determine minimum order based on distance
    const minOrder = distance <= LOCAL_RADIUS_KM ? LOCAL_MIN_ORDER : DEFAULT_MIN_ORDER;

    return NextResponse.json({
      distance,
      minOrder,
      isLocal: distance <= LOCAL_RADIUS_KM,
      shopLat: SHOP_LAT,
      shopLng: SHOP_LNG,
    });
  } catch (error) {
    console.error('Distance API error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate distance' },
      { status: 500 }
    );
  }
}

// ─── Haversine formula – calculates distance between two coordinates (in km) ───
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}