export const shopping = {
  title: "Shopping list", description: "Ingredients you plan to buy.", close: "Close shopping list",
  loading: "Loading shopping list...", loadError: "Could not load shopping list.", empty: "Your shopping list is empty.",
  remove: "Remove {{name}}", removeError: "Could not remove item.", added: "Added to shopping list.",
  review: "Review quantities and possible matches before adding.", quantity: "Quantity of {{name}}",
  available: "Available in inventory", missing: "Suggested missing: {{count}} {{unit}}",
  matches: "Possible matches: {{names}}. Please check.", adding: "Adding...", addSelected: "Add selected to shopping list",
  addError: "Could not add items.", checking: "Checking inventory...", checkError: "Could not check inventory.",
} as const;
