// WordPress API utility functions

// Use NEXT_PUBLIC_WORDPRESS_URL as the primary variable, with fallback to NEXT_PUBLIC_WORDPRESS_API_URL
const WORDPRESS_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 
                         process.env.NEXT_PUBLIC_WORDPRESS_API_URL ||
                         '';

// Only show warning in development
if (process.env.NODE_ENV !== 'production') {
  if (!WORDPRESS_API_URL) {
    console.warn('WordPress API URL is not set in environment variables. Please set NEXT_PUBLIC_WORDPRESS_URL');
  } else {
    console.log('Using WordPress API URL:', WORDPRESS_API_URL);
  }
}

export interface WPPost {
  id: number;
  slug: string;
  title: {
    rendered: string;
  };
  featured_title?: string;
  room_rates?: string;
  room_size?: string;
  bed_type?: string;
  max_guests?: number;
  excerpt?: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  featured_media?: number;
  acf?: {
    price_per_night?: number;
    max_guests?: number;
    room_size?: string;
    bed_type?: string;
    featured_image?: number;
    gallery?: number[];
    [key: string]: any; // For any other ACF fields
  };
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      alt_text?: string;
    }>;
  };
}

export async function getPosts(postType: string, params: Record<string, any> = {}): Promise<WPPost[]> {
  const defaultParams = {
    _embed: true,
    per_page: 100,
    ...params,
  };

  const queryString = new URLSearchParams(
    Object.entries(defaultParams)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  ).toString();

  const response = await fetch(
    `${WORDPRESS_API_URL}/wp-json/wp/v2/${postType}?${queryString}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ${postType}`);
  }

  return response.json();
}

export async function getPostBySlug(postType: string, slug: string): Promise<WPPost> {
  const posts = await getPosts(postType, { slug, _embed: true });
  
  if (!posts.length) {
    throw new Error(`No ${postType} found with slug: ${slug}`);
  }

  return posts[0];
}

export async function getFeaturedImageUrl(mediaId: number): Promise<string | null> {
  try {
    const response = await fetch(
      `${WORDPRESS_API_URL}/wp-json/wp/v2/media/${mediaId}`
    );
    
    if (!response.ok) {
      return null;
    }
    
    const media = await response.json();
    return media?.source_url || null;
  } catch (error) {
    console.error('Error fetching featured image:', error);
    return null;
  }
}
