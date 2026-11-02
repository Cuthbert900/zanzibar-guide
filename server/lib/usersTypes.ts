export interface MapLocationLike {
  id: string;
  name: string;
  type: "attraction" | "hotel" | "emergency";
  lat: number;
  lng: number;
  description?: string;
  price?: string;
}
