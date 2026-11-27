import { copy } from "../../copy/en";

const items = copy.landing.market.items;
type SamplePhoto = keyof typeof items;

export const MARKET_SAMPLES = (Object.keys(items) as SamplePhoto[]).map((photo) => ({
  photo,
  ...items[photo],
}));
