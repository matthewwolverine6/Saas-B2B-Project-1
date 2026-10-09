export type GlampingCategory = 'all' | 'a-frame' | 'dome' | 'chalet' | 'water' | 'hot-tub';

export interface AmenityItem {
  id: string;
  name: string;
  icon: string;
}

export interface AddOnService {
  id: string;
  name: string;
  price: number;
  description: string;
  defaultChecked?: boolean;
}

export interface GlampingItem {
  id: string;
  title: string;
  tagline: string;
  category: GlampingCategory;
  categoryName: string;
  location: string;
  distance: string;
  region: string;
  pricePerNight: number;
  rating: number;
  reviewsCount: number;
  isSuperhost: boolean;
  badges: string[];
  features: string[];
  images: string[];
  description: string;
  capacity: {
    maxGuests: number;
    bedrooms: number;
    beds: number;
    areaM2: number;
  };
  amenities: AmenityItem[];
  addOns: AddOnService[];
  // Quick filter flags
  hasHotTub: boolean;
  hasRiver: boolean;
  isDogFriendly: boolean;
  hasSauna: boolean;
}

export interface SearchFilters {
  checkIn: string;
  checkOut: string;
  guests: number;
  selectedCategory: GlampingCategory;
  hasHotTub: boolean;
  hasRiver: boolean;
  isDogFriendly: boolean;
  hasSauna: boolean;
}

export interface BookingSubmission {
  glamping: GlampingItem;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  selectedAddOns: AddOnService[];
  basePrice: number;
  addOnsPrice: number;
  totalPrice: number;
  name: string;
  phone: string;
  telegram: string;
}
