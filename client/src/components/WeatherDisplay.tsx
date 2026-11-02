import { Cloud, CloudRain, Sun, Wind, Droplets } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface WeatherData {
  location: string;
  temperature: number;
  condition: "sunny" | "cloudy" | "rainy";
  humidity: number;
  windSpeed: number;
  forecast: Array<{
    day: string;
    high: number;
    low: number;
    condition: "sunny" | "cloudy" | "rainy";
  }>;
}

interface WeatherDisplayProps {
  weather: WeatherData;
}

export function WeatherDisplay({ weather }: WeatherDisplayProps) {
  const { t } = useLanguage();

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case "sunny":
        return <Sun className="w-8 h-8 text-yellow-500" />;
      case "cloudy":
        return <Cloud className="w-8 h-8 text-muted-foreground" />;
      case "rainy":
        return <CloudRain className="w-8 h-8 text-primary" />;
      default:
        return <Sun className="w-8 h-8 text-yellow-500" />;
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case "sunny":
        return "Sunny";
      case "cloudy":
        return "Cloudy";
      case "rainy":
        return "Rainy";
      default:
        return "Clear";
    }
  };

  return (
    <div className="bg-gradient-to-br from-secondary to-accent rounded-lg p-4 border border-border space-y-4">
      {/* Current Weather */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">{t("weather")} - {weather.location}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getWeatherIcon(weather.condition)}
            <div>
              <p className="text-3xl font-bold text-foreground">{weather.temperature}°C</p>
              <p className="text-sm text-muted-foreground">{getConditionText(weather.condition)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Details */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
        <div className="flex items-center gap-2 text-sm">
          <Droplets className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">{t("humidity")}</p>
            <p className="font-medium text-foreground">{weather.humidity}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Wind className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">{t("windSpeed")}</p>
            <p className="font-medium text-foreground">{weather.windSpeed} km/h</p>
          </div>
        </div>
      </div>

      {/* Forecast */}
      {weather.forecast && weather.forecast.length > 0 && (
        <div className="pt-2 border-t border-border space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">3-Day Forecast</p>
          <div className="flex gap-2">
            {weather.forecast.slice(0, 3).map((day, idx) => (
              <div key={idx} className="flex-1 bg-card rounded-lg p-2 text-center border border-border">
                <p className="text-xs font-medium text-foreground mb-1">{day.day}</p>
                <div className="flex justify-center mb-1">{getWeatherIcon(day.condition)}</div>
                <p className="text-xs text-muted-foreground">
                  {day.high}° / {day.low}°
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
