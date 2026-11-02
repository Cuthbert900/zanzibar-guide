import { WeatherData } from "@/components/WeatherDisplay";

const weatherDatabase: Record<string, WeatherData> = {
  "Historic Temple": {
    location: "Historic Temple",
    temperature: 28,
    condition: "sunny",
    humidity: 65,
    windSpeed: 12,
    forecast: [
      { day: "Today", high: 28, low: 22, condition: "sunny" },
      { day: "Tomorrow", high: 26, low: 20, condition: "cloudy" },
      { day: "Day 3", high: 24, low: 18, condition: "rainy" },
    ],
  },
  "Coastal Beach": {
    location: "Coastal Beach",
    temperature: 32,
    condition: "sunny",
    humidity: 75,
    windSpeed: 18,
    forecast: [
      { day: "Today", high: 32, low: 26, condition: "sunny" },
      { day: "Tomorrow", high: 30, low: 24, condition: "sunny" },
      { day: "Day 3", high: 28, low: 22, condition: "cloudy" },
    ],
  },
  "Cultural Museum": {
    location: "Cultural Museum",
    temperature: 25,
    condition: "cloudy",
    humidity: 60,
    windSpeed: 10,
    forecast: [
      { day: "Today", high: 25, low: 20, condition: "cloudy" },
      { day: "Tomorrow", high: 27, low: 21, condition: "sunny" },
      { day: "Day 3", high: 26, low: 20, condition: "cloudy" },
    ],
  },
  "Luxury Resort": {
    location: "Luxury Resort",
    temperature: 30,
    condition: "sunny",
    humidity: 70,
    windSpeed: 15,
    forecast: [
      { day: "Today", high: 30, low: 24, condition: "sunny" },
      { day: "Tomorrow", high: 29, low: 23, condition: "sunny" },
      { day: "Day 3", high: 27, low: 21, condition: "cloudy" },
    ],
  },
  "Comfort Hotel": {
    location: "Comfort Hotel",
    temperature: 26,
    condition: "cloudy",
    humidity: 65,
    windSpeed: 12,
    forecast: [
      { day: "Today", high: 26, low: 20, condition: "cloudy" },
      { day: "Tomorrow", high: 28, low: 22, condition: "sunny" },
      { day: "Day 3", high: 27, low: 21, condition: "cloudy" },
    ],
  },
  "Budget Inn": {
    location: "Budget Inn",
    temperature: 24,
    condition: "rainy",
    humidity: 80,
    windSpeed: 20,
    forecast: [
      { day: "Today", high: 24, low: 18, condition: "rainy" },
      { day: "Tomorrow", high: 26, low: 20, condition: "cloudy" },
      { day: "Day 3", high: 28, low: 22, condition: "sunny" },
    ],
  },
  "Central Police Station": {
    location: "Central Police Station",
    temperature: 27,
    condition: "sunny",
    humidity: 62,
    windSpeed: 11,
    forecast: [
      { day: "Today", high: 27, low: 21, condition: "sunny" },
      { day: "Tomorrow", high: 26, low: 20, condition: "cloudy" },
      { day: "Day 3", high: 25, low: 19, condition: "rainy" },
    ],
  },
  "City Hospital": {
    location: "City Hospital",
    temperature: 26,
    condition: "cloudy",
    humidity: 68,
    windSpeed: 13,
    forecast: [
      { day: "Today", high: 26, low: 20, condition: "cloudy" },
      { day: "Tomorrow", high: 27, low: 21, condition: "sunny" },
      { day: "Day 3", high: 26, low: 20, condition: "cloudy" },
    ],
  },
};

export function getWeatherForLocation(locationName: string): WeatherData {
  return (
    weatherDatabase[locationName] || {
      location: locationName,
      temperature: 25,
      condition: "sunny",
      humidity: 65,
      windSpeed: 12,
      forecast: [
        { day: "Today", high: 25, low: 20, condition: "sunny" },
        { day: "Tomorrow", high: 24, low: 19, condition: "cloudy" },
        { day: "Day 3", high: 23, low: 18, condition: "rainy" },
      ],
    }
  );
}
