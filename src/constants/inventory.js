/** inventory -- App-wide config: storage key, API endpoints, input limits, default house structure */

export const STORAGE_KEY = "home-inventory-v2";
export const API_PROXY = import.meta.env.VITE_API_PROXY_URL || "";
export const API_KEY = import.meta.env.VITE_API_KEY || "";
export const MAX_INPUT_LENGTH = 500;

export const DEFAULT_STRUCTURE = {
  id: "house", name: "House", type: "house", children: [
    { id: "f1", name: "Main Floor", type: "floor", children: [
      { id: "garage", name: "Garage", type: "room", children: [] },
      { id: "office_main", name: "Office (Main)", type: "room", children: [] },
      { id: "kitchen", name: "Kitchen", type: "room", children: [] },
      { id: "pantry", name: "Pantry", type: "room", children: [] },
      { id: "dining", name: "Dining Area", type: "room", children: [] },
      { id: "living", name: "Living Room", type: "room", children: [] },
      { id: "foyer", name: "Foyer", type: "room", children: [] },
      { id: "bath_main", name: "Bath (Main)", type: "room", children: [] },
      { id: "laundry_closet", name: "Hall", type: "room", children: [] },
      { id: "office_up", name: "Office (Upper)", type: "room", children: [] },
      { id: "screened_porch", name: "Screened Porch", type: "room", children: [] },
      { id: "deck", name: "Deck", type: "room", children: [] },
      { id: "porch", name: "Porch", type: "room", children: [] },
    ]},
    { id: "f2", name: "Upper Floor", type: "floor", children: [
      { id: "primary_bed", name: "Primary Bedroom", type: "room", children: [] },
      { id: "bath_primary", name: "Bath (Primary)", type: "room", children: [] },
      { id: "wic_primary", name: "W.I.C. (Primary)", type: "room", children: [] },
      { id: "bedroom_2", name: "Bedroom 2", type: "room", children: [] },
      { id: "wic_2", name: "W.I.C. (Bed 2)", type: "room", children: [] },
      { id: "bath_2", name: "Bath 2", type: "room", children: [] },
      { id: "hall_upper", name: "Hall", type: "room", children: [] },
      { id: "laundry", name: "Laundry", type: "room", children: [] },
      { id: "bedroom_3", name: "Bedroom 3", type: "room", children: [] },
      { id: "bedroom_4", name: "Bedroom 4", type: "room", children: [] },
      { id: "wic_4", name: "W.I.C. (Bed 4)", type: "room", children: [] },
    ]},
    { id: "f3", name: "Lower Level", type: "floor", children: [
      { id: "exercise", name: "Exercise Room", type: "room", children: [] },
      { id: "bath_lower", name: "Bath (Lower)", type: "room", children: [] },
      { id: "attic", name: "Attic", type: "room", children: [] },
    ]},
  ]
};
