// Feeding time at the Daydaze Zoo (orders.ts): each call is an enclosure
// that's hungry; fill the bucket with what those animals eat.
import type { Station } from "./orders.ts";

export const FEEDING: Station = {
  ingredients: [
    { id: "hay", label: "Hay" },
    { id: "leaves", label: "Acacia leaves" },
    { id: "fruit", label: "Fruit" },
    { id: "meat", label: "Meat" },
    { id: "fish", label: "Fish" },
    { id: "shrimp", label: "Shrimp" },
    { id: "pellets", label: "Pellets" },
  ],
  menu: [
    { name: "the giraffes", recipe: ["leaves", "leaves", "pellets"] },
    { name: "the zebras", recipe: ["hay", "hay", "pellets"] },
    { name: "the elephants", recipe: ["hay", "hay", "fruit", "fruit"] },
    { name: "the lions", recipe: ["meat", "meat"] },
    { name: "the penguins", recipe: ["fish", "fish", "fish"] },
    { name: "the flamingos", recipe: ["shrimp", "pellets"] },
  ],
};
