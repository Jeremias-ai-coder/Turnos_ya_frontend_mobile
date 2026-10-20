export interface User {
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'BUSINESS_OWNER' | 'ADMIN' | string;
  phone?: string;
  emailNotifications?: boolean;
  whatsappNotifications?: boolean;
}

export interface BusinessService {
  id: number;
  businessId?: number;
  name: string;
  description?: string;
  price?: number;
  durationMinutes?: number;
}

export interface Business {
  id: number;
  name: string;
  address: string;
  phone: string;
  category: string;
  categoryId?: number;
  description?: string;
  rating?: number | null;
  reviewCount?: number;
  services?: BusinessService[];
  imageUrl?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  distanceKm?: number;
}

export interface Schedule {
  id: number;
  businessId: number;
  dayOfWeek: number; // 1 = Lunes, ..., 7 = Domingo
  startTime: string; // "09:00:00"
  endTime: string;   // "18:00:00"
}

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Appointment {
  id: number;
  userId: number;
  businessId: number;
  serviceId: number;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  client?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  business?: {
    id: number;
    name: string;
    address: string;
    phone?: string;
  };
  service?: {
    id: number;
    name: string;
    price?: number;
    durationMinutes?: number;
  };
}

export interface Review {
  id: number;
  userId: number;
  businessId: number;
  rating: number;
  comment?: string;
  createdAt: string;
  user?: {
    name: string;
  };
}

export interface Category {
  id: number;
  name: string;
  icon?: string;
}
