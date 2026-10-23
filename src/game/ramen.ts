// Ramen Rush at Steam Ladle Ramen (orders.ts): the broth goes in first, then
// the noodles, then the toppings, each bowl as the ticket calls it.
import type { Station } from "./orders.ts";

export const RAMEN: Station = {
  ingredients: [
    { id: "tonkotsu", label: "Tonkotsu broth" },
    { id: "miso", label: "Miso broth" },
    { id: "shoyu", label: "Shoyu broth" },
    { id: "noodles", label: "Noodles" },
    { id: "chashu", label: "Chashu" },
    { id: "egg", label: "Soft egg" },
    { id: "nori", label: "Nori" },
    { id: "scallion", label: "Scallion" },
    { id: "corn", label: "Corn" },
    { id: "menma", label: "Menma" },
    { id: "chili", label: "Chili oil" },
  ],
  menu: [
    {
      name: "Tonkotsu ramen",
      recipe: ["tonkotsu", "noodles", "chashu", "egg", "nori", "scallion"],
    },
    {
      name: "Miso ramen with corn",
      recipe: ["miso", "noodles", "corn", "chashu", "scallion"],
    },
    {
      name: "Shoyu ramen",
      recipe: ["shoyu", "noodles", "chashu", "menma", "nori"],
    },
    {
      name: "Spicy miso",
      recipe: ["miso", "noodles", "chili", "egg", "scallion"],
    },
    {
      name: "Double chashu",
      recipe: ["tonkotsu", "noodles", "chashu", "chashu", "egg"],
    },
    { name: "Kids' shoyu", recipe: ["shoyu", "noodles", "corn", "egg"] },
  ],
};
