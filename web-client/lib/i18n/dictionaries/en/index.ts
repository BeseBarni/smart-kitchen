import { auth } from "./auth";
import { common } from "./common";
import { errors } from "./errors";
import { nav } from "./nav";
import { settings } from "./settings";
import { inventory } from "./inventory";
import { recipes } from "./recipes";
import { mealTracker } from "./meal-tracker";
import { chat } from "./chat";
import { shopping } from "./shopping";
import { offline } from "./offline";

export const en = { common, nav, auth, settings, errors, inventory, recipes, mealTracker, chat, shopping, offline } as const;
