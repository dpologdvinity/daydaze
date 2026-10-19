// Espresso Lab's barista station (orders.ts): shots, milks, ice, syrups
// and toppings, and the drinks on the chalkboard.
import type { Station } from "./orders.ts";

export const ESPRESSO: Station = {
  ingredients: [
    { id: "espresso", label: "Espresso shot" },
    { id: "whole", label: "Whole milk" },
    { id: "oat", label: "Oat milk" },
    { id: "ice", label: "Ice" },
    { id: "caramel", label: "Caramel" },
    { id: "vanilla", label: "Vanilla" },
    { id: "ube", label: "Ube" },
    { id: "foam", label: "Foam" },
    { id: "cinnamon", label: "Cinnamon" },
  ],
  menu: [
    { name: "Espresso", recipe: ["espresso"] },
    { name: "Doppio", recipe: ["espresso", "espresso"] },
    { name: "Latte", recipe: ["espresso", "whole", "foam"] },
    { name: "Oat latte", recipe: ["espresso", "oat", "foam"] },
    {
      name: "Cappuccino",
      recipe: ["espresso", "whole", "foam", "foam", "cinnamon"],
    },
    {
      name: "Iced caramel latte",
      recipe: ["ice", "espresso", "whole", "caramel"],
    },
    { name: "Iced vanilla oat", recipe: ["ice", "espresso", "oat", "vanilla"] },
    { name: "Ube latte", recipe: ["espresso", "oat", "ube", "foam"] },
    {
      name: "Dirty horchata",
      recipe: ["ice", "espresso", "oat", "vanilla", "cinnamon"],
    },
  ],
};
