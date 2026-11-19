import { listRecipes, setRecipeFavorite } from "../mocks/recipes.mock";

export const recipesApi = {
  list: listRecipes,
  setFavorite: setRecipeFavorite,
};
