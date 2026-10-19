// The halo-halo counter at Halo-Halo Haus (orders.ts): shaved ice and
// milk, the layers of sweets underneath, and the toppings that crown it.
import type { Station } from "./orders.ts";

export const HALO_HALO: Station = {
  ingredients: [
    { id: "ice", label: "Shaved ice" },
    { id: "milk", label: "Evaporated milk" },
    { id: "beans", label: "Sweet red beans" },
    { id: "nata", label: "Nata de coco" },
    { id: "kaong", label: "Kaong" },
    { id: "langka", label: "Langka" },
    { id: "ube", label: "Ube halaya" },
    { id: "flan", label: "Leche flan" },
    { id: "pinipig", label: "Pinipig" },
    { id: "ube-ice-cream", label: "Ube ice cream" },
    { id: "mango", label: "Mango" },
  ],
  menu: [
    {
      name: "Classic halo-halo",
      recipe: ["beans", "nata", "kaong", "ice", "milk", "flan"],
    },
    {
      name: "Ube overload",
      recipe: ["ube", "ice", "milk", "ube-ice-cream", "pinipig"],
    },
    { name: "Mango halo-halo", recipe: ["mango", "nata", "ice", "milk"] },
    {
      name: "Leche flan special",
      recipe: ["beans", "langka", "ice", "milk", "flan", "flan"],
    },
    { name: "Just the toppings", recipe: ["flan", "ube-ice-cream", "pinipig"] },
    {
      name: "Fruit cup",
      recipe: ["nata", "kaong", "langka", "mango", "ice"],
    },
  ],
};
