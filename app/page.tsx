import { HomeClient } from "./home-client";
import { LatestArticles } from "./components/articles/latest-articles";
import { getMediumArticles } from "../lib/medium";

export default async function Home() {
  return <HomeClient latestArticles={<LatestArticles feed={await getMediumArticles()} />} />;
}
