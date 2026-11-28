import { Activity, Sparkles, Bag, BookOpen, Bookmark, Coffee, Compass, Flower2, Map, MapPin, Stamp, Utensils, Wine } from "./lucide";
export const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  compass: Compass, map: Map, book: BookOpen, pin: MapPin, stamp: Stamp, bookmark: Bookmark,
  utensils: Utensils, wine: Wine, coffee: Coffee, flower: Flower2, bag: Bag, activity: Activity, sparkles: Sparkles,
};
