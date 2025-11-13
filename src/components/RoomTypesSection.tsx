'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { api, WPPost } from '@/lib/api';

interface GalleryItem {
  url: string;
  [key: string]: unknown;
}

interface RoomACFFields {
  features?: string[];
  price_per_night?: string | number;
  max_guests?: string | number;
  size?: string;
  gallery?: GalleryItem[] | GalleryItem;
  [key: string]: unknown;
}

interface Room extends Omit<WPPost, 'acf' | '_embedded'> {
  acf?: RoomACFFields;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  better_featured_image?: {
    source_url: string;
  };
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      media_details?: {
        sizes?: {
          large?: { source_url: string };
          medium_large?: { source_url: string };
          medium?: { source_url: string };
          thumbnail?: { source_url: string };
          [key: string]: {
            source_url: string;
            width?: number;
            height?: number;
            mime_type?: string;
            [key: string]: unknown;
          } | undefined;
        };
      };
      [key: string]: unknown;
    }>;
  };
}

const RoomTypesSection = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Function to normalize room data
  const getNormalizedRooms = useCallback((roomList: Room[]): Room[] => {
    if (!roomList || !Array.isArray(roomList)) return [];
    
    return roomList.map(room => {
      if (!room.acf) return room;
      
      // Normalize gallery to always be an array of GalleryItem
      const gallery: GalleryItem[] = [];
      
      if (Array.isArray(room.acf.gallery)) {
        gallery.push(...room.acf.gallery);
      } else if (room.acf.gallery && typeof room.acf.gallery === 'object' && 'url' in room.acf.gallery) {
        gallery.push(room.acf.gallery as GalleryItem);
      }
          
      return {
        ...room,
        acf: {
          ...room.acf,
          gallery,
        },
      };
    });
  }, []);
  
  // Get normalized rooms for display
  const displayRooms = useMemo(() => getNormalizedRooms(rooms), [getNormalizedRooms, rooms]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const data = await api.getRooms();
        setRooms(data as Room[]);
        console.log('Fetched rooms:', data);
      } catch (err) {
        console.error('Error fetching rooms:', err);
        setError('Failed to load rooms. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const getImageUrl = (room: Room): string => {
    // Default image path
    const defaultImage = '/images/rooms/default-room.png';
    
    // Try better_featured_image first
    if (room.better_featured_image?.source_url) {
      return room.better_featured_image.source_url;
    }
    
    // Check embedded media
    const featuredMedia = room._embedded?.['wp:featuredmedia']?.[0];
    if (!featuredMedia) return defaultImage;
    
    // Try different sizes in order of preference
    const sizes = featuredMedia.media_details?.sizes;
    if (sizes) {
      if (sizes.large?.source_url) return sizes.large.source_url;
      if (sizes.medium_large?.source_url) return sizes.medium_large.source_url;
      if (sizes.medium?.source_url) return sizes.medium.source_url;
      if (sizes.thumbnail?.source_url) return sizes.thumbnail.source_url;
    }
    
    // Fallback to featured media source URL
    if (featuredMedia.source_url) {
      return featuredMedia.source_url;
    }
    
    return defaultImage;
  };

  if (loading) {
    return (
      <section className="py-12 md:py-16 bg-white text-gray-800">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Our Room Types</h2>
            <div className="w-20 h-1 bg-yellow-500 mx-auto mb-6"></div>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Loading our beautiful rooms...
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden shadow-md animate-pulse">
                <div className="bg-gray-200 h-64 w-full"></div>
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-10 bg-gray-200 rounded mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12 md:py-16 bg-white text-gray-800">
        <div className="container mx-auto px-4 max-w-7xl text-center">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
            <p className="text-red-700">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16 bg-white text-gray-800">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Room Types</h2>
          <div className="w-20 h-1 bg-yellow-500 mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {displayRooms.map((room) => {
            const imageUrl = getImageUrl(room);
            
            return (
              <div key={`room-${room.id}`} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
                <div className="relative h-64 w-full">
                  <Image
                    src={imageUrl}
                    alt={room.title.rendered || 'Room Image'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={false}
                  />
                </div>
                <div className="p-6 grow flex flex-col">
                  <h3 
                    className="text-xl font-semibold mb-2"
                    dangerouslySetInnerHTML={{ __html: room.title.rendered || 'Room' }}
                  />
                  <div className="text-gray-600 mb-4 line-clamp-4 grow">
                    {room.content?.rendered 
                      ? <div dangerouslySetInnerHTML={{ __html: room.content.rendered.replace(/<[^>]*>/g, ' ').substring(0, 200) + '...' }} />
                      : 'No description available.'
                    }
                  </div>
                  <button className="w-full mt-4 bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
export default RoomTypesSection;
