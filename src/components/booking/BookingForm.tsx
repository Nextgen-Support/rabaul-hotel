'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, isBefore, isToday, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookingFormData, BookingFormErrors } from '@/types/booking';
import { getRooms } from '@/lib/api';

interface WPRoom {
  id: number;
  slug: string;
  title: {
    rendered: string;
  };
  content?: {
    rendered: string;
  };
  excerpt?: {
    rendered: string;
  };
  acf?: {
    price_per_night?: number;
    max_guests?: number;
    room_size?: string;
    bed_type?: string;
    featured_image?: number;
    gallery?: number[];
  };
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      alt_text?: string;
    }>;
  };
  // Add fields from the API response
  featured_title?: string;
  room_rates?: string;
  room_size?: string;
  bed_type?: string;
  max_guests?: number;
}

export default function BookingForm() {
  const router = useRouter();

  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);

  const [formData, setFormData] = useState<Omit<BookingFormData, 'roomType'> & { roomType: string | 'select' }>({
    checkIn: (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    })(),
    checkOut: (() => {
      const inThreeDays = new Date();
      inThreeDays.setDate(inThreeDays.getDate() + 3);
      return inThreeDays;
    })(),
    roomType: 'select',
    adults: 2,
    children: 0,
  });

  const [errors, setErrors] = useState<BookingFormErrors>({});

  // Fetch rooms from WordPress
  const [roomTypes, setRoomTypes] = useState<WPRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setIsLoadingRooms(true);
        
        // First, fetch the rooms
        const rooms = await getRooms();
        console.log('Fetched rooms:', rooms);
        
        if (!rooms || rooms.length === 0) {
          throw new Error('No rooms found');
        }
      
        // Then fetch room rates from the correct endpoint
        interface RoomRates {
          [key: number]: {
            price_per_night?: number;
            [key: string]: any;
          };
        }
        
        let roomRates: RoomRates = {};
        try {
          const wordpressUrl = process.env['NEXT_PUBLIC_WORDPRESS_URL'];
          if (!wordpressUrl) {
            console.warn('WordPress URL is not configured');
          } else {
            const ratesResponse = await fetch(`${wordpressUrl}/wp-json/wp/v2/rooms?_fields=id,acf`);
            if (ratesResponse.ok) {
              const ratesData = await ratesResponse.json();
              roomRates = ratesData.reduce((acc: RoomRates, room: any) => {
                if (room.acf) {
                  acc[room.id] = room.acf;
                }
                return acc;
              }, {} as RoomRates);
            }
          }
        } catch (error) {
          console.warn('Could not fetch room rates:', error);
        }
        
        // Enhance rooms with their rates
        const enhancedRooms = rooms.map(room => ({
          ...room,
          room_rates: room.room_rates || (roomRates[room.id]?.price_per_night ? `K${roomRates[room.id].price_per_night}` : undefined)
        }));
        
        console.log('Enhanced rooms:', enhancedRooms);
        
        setRoomTypes(enhancedRooms);
        setRoomsError(null);
      } catch (error) {
        console.error('Error fetching rooms:', error);
        setRoomsError('Failed to load room information. Please try again later.');
      } finally {
        setIsLoadingRooms(false);
      }
    };

    fetchRooms();
  }, []);
  
  // Sort rooms by price (extracting numeric value from price_per_night)
  const sortedRooms = [...roomTypes].sort((a, b) => {
    const rateA = a.acf?.price_per_night || 0;
    const rateB = b.acf?.price_per_night || 0;
    return rateA - rateB;
  });

  const validateForm = (): boolean => {
    const newErrors: BookingFormErrors = {};
    
    if (!formData.checkIn) newErrors.checkIn = 'Check-in date is required';
    if (!formData.checkOut) newErrors.checkOut = 'Check-out date is required';
    if (formData.checkIn && formData.checkOut && isBefore(formData.checkOut, formData.checkIn)) {
      newErrors.checkOut = 'Check-out date must be after check-in date';
    }
    if (!formData.roomType || formData.roomType === 'select') newErrors.roomType = 'Please select a room type';
    if (formData.adults < 1) newErrors.adults = 'At least one adult is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !formData.checkIn || !formData.checkOut) return;

    const selectedRoom = roomTypes.find(room => room.slug === formData.roomType);
    const roomId = selectedRoom?.id || '';
    const formattedCheckIn = format(formData.checkIn, 'yyyy-MM-dd');
    const formattedCheckOut = format(formData.checkOut, 'yyyy-MM-dd');

    router.push(
      `/booking?checkIn=${formattedCheckIn}&checkOut=${formattedCheckOut}&roomId=${roomId}&adults=${formData.adults}&children=${formData.children}`
    );
  };

  // Auto-update checkOut if it's before checkIn
  useEffect(() => {
    if (formData.checkIn && formData.checkOut && isBefore(formData.checkOut, formData.checkIn)) {
      const nextDay = addDays(formData.checkIn, 1);
      setFormData(prev => ({ ...prev, checkOut: nextDay }));
    }
  }, [formData.checkIn]);

  return (
    <Card id="booking" className="mx-auto max-w-4xl border-none bg-white/90 backdrop-blur-sm shadow-xl">
      <CardHeader className="bg-primary/10">
        <CardTitle className="text-center text-2xl font-bold text-primary">Book Your Stay</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2" aria-label="Booking form">

          {/* Check-in Date */}
          <div className="space-y-2">
            <Label htmlFor="check-in-date">Check-in Date</Label>
            <Popover open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="check-in-date"
                  name="checkIn"
                  type="button"
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${errors.checkIn ? 'border-destructive' : ''}`}
                  aria-label="Select check-in date"
                  aria-haspopup="dialog"
                  aria-expanded={isCheckInOpen}
                  aria-controls="check-in-calendar"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.checkIn ? format(formData.checkIn, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent id="check-in-calendar" className="w-[300px] p-0" align="start">
                <Calendar
                  selected={formData.checkIn}
                  onSelect={(date) => {
                    if (date) {
                      setFormData(prev => ({ ...prev, checkIn: date }));
                      setErrors(prev => ({ ...prev, checkIn: '' }));
                      setIsCheckInOpen(false);
                    }
                  }}
                  disabled={(date) => isBefore(date, addDays(new Date(), 0)) && !isToday(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.checkIn && <p className="text-sm text-destructive" id="check-in-error">{errors.checkIn}</p>}
          </div>

          {/* Check-out Date */}
          <div className="space-y-2">
            <Label htmlFor="check-out-date">Check-out Date</Label>
            <Popover open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="check-out-date"
                  name="checkOut"
                  type="button"
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${errors.checkOut ? 'border-destructive' : ''}`}
                  aria-label="Select check-out date"
                  aria-haspopup="dialog"
                  aria-expanded={isCheckOutOpen}
                  aria-controls="check-out-calendar"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.checkOut ? format(formData.checkOut, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent id="check-out-calendar" className="w-[300px] p-0" align="start">
                <Calendar
                  selected={formData.checkOut}
                  onSelect={(date) => {
                    if (date) {
                      setFormData(prev => ({ ...prev, checkOut: date }));
                      setErrors(prev => ({ ...prev, checkOut: '' }));
                      setIsCheckOutOpen(false);
                    }
                  }}
                  disabled={(date) =>
                    formData.checkIn
                      ? isBefore(date, formData.checkIn) && !isSameDay(date, formData.checkIn)
                      : isBefore(date, addDays(new Date(), 1))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.checkOut && <p className="text-sm text-destructive" id="check-out-error">{errors.checkOut}</p>}
          </div>

          {/* Room Type */}
          <div className="space-y-2">
            <Label htmlFor="room-type-select">Room Type</Label>
            <Select
              name="roomType"
              value={formData.roomType}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, roomType: value }));
                setErrors(prev => ({ ...prev, roomType: '' }));
              }}
              disabled={isLoadingRooms}
            >
              <SelectTrigger 
                id="room-type-select"
                className={`${errors.roomType ? 'border-destructive' : ''}`}
                aria-label="Select room type"
                aria-describedby={errors.roomType ? 'room-type-error' : undefined}
              >
                <SelectValue placeholder={isLoadingRooms ? 'Loading rooms...' : 'Select a room type'} />
              </SelectTrigger>
              <SelectContent className="max-h-[400px] overflow-y-auto">
                <SelectItem value="select" disabled>Select a room type</SelectItem>
                {isLoadingRooms ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Loading rooms...</div>
                ) : sortedRooms.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No rooms available</div>
                ) : (
                  sortedRooms.map((room) => {
                    // Debug log for each room
                    console.log('Rendering room:', {
                      id: room.id,
                      title: room.title?.rendered,
                      featured_title: room.featured_title,
                      slug: room.slug,
                      room_rates: room.room_rates,
                      acf: room.acf
                    });
                    
                    // Get room name with fallbacks
                    const roomName = room.title?.rendered || 
                                  room.featured_title || 
                                  (room.slug ? room.slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '') || 
                                  `Room ${room.id}`;
                    
                    // Get room rate with fallbacks
                    const rateValue = room.room_rates || 
                                   (room.acf?.price_per_night ? `K${room.acf.price_per_night}` : 'K0');
                    const rate = rateValue.toString().startsWith('K') ? rateValue : `K${rateValue}`;
                    
                    // Get room description
                    let description = '';
                    if (room.excerpt?.rendered) {
                      const doc = new DOMParser().parseFromString(room.excerpt.rendered, 'text/html');
                      description = doc.body.textContent?.trim() || '';
                    } 
                    if (!description && room.content?.rendered) {
                      const doc = new DOMParser().parseFromString(room.content.rendered, 'text/html');
                      description = doc.body.textContent?.trim() || '';
                    }
                    
                    // Get room details with fallbacks
                    const roomSize = room.room_size || room.acf?.room_size;
                    const bedType = room.bed_type || room.acf?.bed_type;
                    const maxGuests = room.max_guests || room.acf?.max_guests;
                    
                    // Build the details string
                    const details = [
                      rate,
                      roomSize,
                      bedType,
                      maxGuests ? `Sleeps ${maxGuests}` : ''
                    ].filter(Boolean).join(' • ');
                    
                    // Get first sentence of description if available
                    const shortDescription = description.split('.')[0] || '';
                    
                    return (
                      <SelectItem key={room.id} value={room.slug}>
                        <div className="flex flex-col">
                          <div className="flex flex-col">
                            <div className="flex justify-between items-baseline">
                              <span className="font-medium">{roomName}</span>
                              <span className="text-primary font-medium ml-2 whitespace-nowrap">{rate} / night</span>
                            </div>
                            {(details || shortDescription) && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {shortDescription ? `${shortDescription}. ` : ''}
                                {details}
                              </p>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
            {roomsError ? (
              <p id="room-type-error" className="text-sm text-destructive">{roomsError}</p>
            ) : errors.roomType ? (
              <p id="room-type-error" className="text-sm text-destructive">{errors.roomType}</p>
            ) : null}
          </div>

          {/* Guests */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adults-input">Adults</Label>
              <Input
                id="adults-input"
                name="adults"
                type="number"
                min={1}
                max={10}
                value={formData.adults}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    const newAdults = Math.min(Math.max(1, value), 10);
                    setFormData(prev => ({ ...prev, adults: newAdults }));
                    setErrors(prev => ({ ...prev, adults: '' }));
                  }
                }}
                className={errors.adults ? 'border-destructive' : ''}
                aria-invalid={!!errors.adults}
                aria-describedby={errors.adults ? 'adults-error' : undefined}
              />
              {errors.adults && <p id="adults-error" className="text-sm text-destructive">{errors.adults}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="children-input">Children</Label>
              <Input
                id="children-input"
                name="children"
                type="number"
                min={0}
                max={10}
                value={formData.children}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    const newChildren = Math.min(Math.max(0, value), 10);
                    setFormData(prev => ({ ...prev, children: newChildren }));
                  }
                }}
                aria-label="Number of children"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="md:col-span-2">
            <Button 
              type="submit" 
              className="w-full py-6 text-lg" 
              size="lg"
              aria-label="Submit booking form"
            >
              Check Availability
            </Button>
          </div>

        </form>
      </CardContent>
    </Card>
  );
}
