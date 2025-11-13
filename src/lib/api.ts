import type { WPPost } from "./wordpress";
export type { WPPost };

// Use NEXT_PUBLIC_WORDPRESS_URL as the primary variable, with fallback to NEXT_PUBLIC_WORDPRESS_API_URL
const WORDPRESS_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 
                         process.env.NEXT_PUBLIC_WORDPRESS_API_URL;

if (!WORDPRESS_API_URL) {
  // Only throw in development to prevent build failures in production
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(
      'WordPress API URL is not defined. Please set NEXT_PUBLIC_WORDPRESS_URL or NEXT_PUBLIC_WORDPRESS_API_URL in your environment variables.'
    );
  } else {
    console.error('WordPress API URL is not configured');
  }
}

const API_BASE_URL = WORDPRESS_API_URL ? `${WORDPRESS_API_URL}/wp-json/wp/v2` : '';

/**
 * Helper to fetch data from WordPress REST API.
 */
export async function fetchAPI<T = any>(
  endpoint: string,
  params: Record<string, any> = {}
): Promise<T> {
  try {
    const url = new URL(`${API_BASE_URL}/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });

    console.log("🌐 Fetching from:", url.toString());

    const response = await fetch(url.toString(), { cache: "no-cache" });

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ API error:", response.status, text);
      throw new Error(`API request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("🚨 fetchAPI failed:", error);
    throw error;
  }
}

/**
 * Get WordPress posts (used for amenities, etc.)
 */
export async function getPosts(type: string): Promise<WPPost[]> {
  try {
    const posts = await fetchAPI<WPPost[]>(type, { per_page: 100, _embed: true });
    return posts;
  } catch (error) {
    console.error(`❌ Unexpected error in getPosts(${type}):`, error);
    throw error;
  }
}

/**
 * Get room data
 */
export async function getRooms(): Promise<WPPost[]> {
  try {
    console.log('Fetching rooms from:', `${WORDPRESS_API_URL}/wp-json/wp/v2/rooms`);
    const response = await fetch(
      `${WORDPRESS_API_URL}/wp-json/wp/v2/rooms?per_page=50&_embed=true`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        error: errorText,
      });
      throw new Error(`Failed to fetch rooms: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    if (!text) {
      console.warn('Empty response received from rooms API');
      return [];
    }

    try {
      const rooms = JSON.parse(text);
      console.log('Successfully fetched rooms:', rooms.length);
      return rooms;
    } catch (parseError) {
      console.error('Failed to parse rooms JSON:', {
        error: parseError,
        responseText: text,
      });
      throw new Error('Invalid JSON response from server');
    }
  } catch (error) {
    console.error("❌ Error in getRooms:", error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
}

/**
 * Get single post by slug
 */
export async function getPostBySlug(type: string, slug: string): Promise<WPPost | null> {
  try {
    const data = await fetchAPI<WPPost[]>(type, { slug, _embed: true });
    return data.length ? data[0] : null;
  } catch (error) {
    console.error(`❌ Error fetching ${type} by slug (${slug}):`, error);
    return null;
  }
}

/**
 * Get amenities data
 */
export async function getAmenities(): Promise<WPPost[]> {
  try {
    const amenities = await fetchAPI<WPPost[]>("amenities", { per_page: 50, _embed: true });
    return amenities;
  } catch (error) {
    console.error("❌ Error fetching amenities:", error);
    throw error;
  }
}

/**
 * Get tourist spots content
 */
export async function getExploreRabaul(): Promise<WPPost[]> {
  try {
    const explore = await fetchAPI<WPPost[]>("tourist-spots", { 
      per_page: 50, 
      _embed: true 
    });
    return explore;
  } catch (error) {
    console.error("❌ Error fetching tourist spots:", error);
    throw error;
  }
}

export const api = {
  fetchAPI,
  getPosts,
  getRooms,
  getPostBySlug,
  getAmenities,
  getExploreRabaul,
};