// The boba bar at Boba & Matcha (orders.ts): teas, milks, sweeteners and
// toppings, and the menu over the counter.
import type { Station } from "./orders.ts";

export const BOBA: Station = {
  ingredients: [
    { id: "black-tea", label: "Black tea" },
    { id: "jasmine", label: "Jasmine green" },
    { id: "matcha", label: "Matcha" },
    { id: "taro", label: "Taro" },
    { id: "milk", label: "Milk" },
    { id: "oat", label: "Oat milk" },
    { id: "brown-sugar", label: "Brown sugar" },
    { id: "pearls", label: "Tapioca pearls" },
    { id: "lychee", label: "Lychee jelly" },
    { id: "mango", label: "Mango popping boba" },
    { id: "cheese-foam", label: "Cheese foam" },
    { id: "ice", label: "Ice" },
  ],
  menu: [
    {
      name: "Classic milk tea",
      recipe: ["black-tea", "milk", "pearls", "ice"],
    },
    { name: "Brown sugar boba", recipe: ["milk", "brown-sugar", "pearls"] },
    { name: "Taro milk tea", recipe: ["taro", "milk", "pearls", "ice"] },
    { name: "Iced matcha latte", recipe: ["matcha", "oat", "ice"] },
    { name: "Jasmine lychee", recipe: ["jasmine", "lychee", "ice"] },
    { name: "Mango green tea", recipe: ["jasmine", "mango", "ice"] },
    {
      name: "Cheese foam black tea",
      recipe: ["black-tea", "cheese-foam", "ice"],
    },
    {
      name: "Matcha brown sugar",
      recipe: ["matcha", "milk", "brown-sugar", "pearls"],
    },
  ],
};
