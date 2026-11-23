import type { Metadata } from "next";
import { resolveText } from "@/lib/i18n/orchestrator";
import {
  fetchSharedRecipe,
  getPublicApiOrigin,
  sharedRecipeImageUrl,
} from "@/features/recipes/api/shared-recipes.api";
import { SharedRecipeFullView } from "@/features/recipes/components/shared/SharedRecipeFullView";
import { SharedRecipeNotFound } from "@/features/recipes/components/shared/SharedRecipeNotFound";

type Props = PageProps<"/r/[token]">;

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const origin = await getPublicApiOrigin();
  const recipe = await fetchSharedRecipe(token, origin);
  const title = recipe?.title ?? resolveText("en", "recipes.shareNotFoundTitle");
  const description = recipe
    ? recipe.description ?? resolveText("en", "recipes.shareMetadataDescription")
    : resolveText("en", "recipes.shareNotFoundDescription");
  const image = sharedRecipeImageUrl(recipe?.imageUrls.large ?? null, origin);
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function SharedRecipePage({ params }: Props): Promise<React.JSX.Element> {
  const { token } = await params;
  const origin = await getPublicApiOrigin();
  const recipe = await fetchSharedRecipe(token, origin);
  return recipe
    ? <SharedRecipeFullView recipe={recipe} />
    : <SharedRecipeNotFound />;
}
