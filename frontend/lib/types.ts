export type TripType =
  | "Vacation"
  | "Honeymoon"
  | "Business"
  | "Family"
  | "Adventure"
  | "Religious"
  | "Weekend"
  | "Medical";

export type PreferenceTag =
  | "Beach"
  | "Mountains"
  | "City"
  | "Nature"
  | "Nightlife"
  | "Food"
  | "Shopping"
  | "Historical";

export interface TripState {
  tripType?: TripType;
  origin?: string;
  budgetINR?: number;
  adults?: number;
  children?: number;
  durationDays?: number;
  preferences?: PreferenceTag[];
  // Filled by agents
  originCode?: string;
  destinationCode?: string;
  candidateDestinations?: string[];
  selectedDestination?: string;
  flightOffers?: FlightOffer[];
  hotelOffers?: HotelOffer[];
  itinerary?: Itinerary;
  recommendationSummary?: string;
}

export interface FlightOffer {
  id: string;
  airline: string;
  airlineLogo?: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  origin?: string;
  destination?: string;
  returnDate?: string;
}

export interface HotelOffer {
  id: string;
  name: string;
  rating: number;
  address: string;
  amenities: string[];
  price: number;
  pricePerNight?: number;
  currency: string;
  image?: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  activities: string[];
}

export interface Itinerary {
  days: ItineraryDay[];
  highlights: string[];
}

export type AgentStepStatus = "pending" | "active" | "done";

export interface AgentStep {
  id: string;
  label: string;
  status: AgentStepStatus;
}

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  quickReplies?: string[];
}

// ── Booking confirmations ─────────────────────────────────────────────

export interface FlightBookingConfirmation {
  bookingType: "flight";
  status: "confirmed" | "pending" | "failed";
  referenceId: string;
  pnr: string;
  eTicket: string;
  airline: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  origin?: string;
  destination?: string;
  totalPrice: number;
  currency: string;
  passengers: number;
  cabinClass?: string;
  bookedAt: string;
}

export interface HotelBookingConfirmation {
  bookingType: "hotel";
  status: "confirmed" | "pending" | "failed";
  referenceId: string;
  confirmationNumber: string;
  hotelName: string;
  rating: number;
  address: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  amenities: string[];
  totalPrice: number;
  pricePerNight: number;
  currency: string;
  cancellationPolicy: string;
  bookedAt: string;
}

export interface CabBookingConfirmation {
  bookingType: "cab";
  status: "confirmed" | "pending" | "failed";
  referenceId: string;
  cabType: string;
  carModel: string;
  carType: string;
  licensePlate: string;
  driverName: string;
  driverPhone: string;
  driverRating: number;
  pickup: string;
  dropoff: string;
  pickupTime: string;
  eta: string;
  distance: string;
  totalPrice: number;
  currency: string;
  otp: string;
  bookedAt: string;
}

export interface CabOption {
  id: string;
  type: string;
  carModel: string;
  carType: string;
  fare: number;
  currency: string;
  distance: string;
  estimatedTime: string;
  eta: string;
  pickup: string;
  dropoff: string;
  seatingCapacity: number;
}
