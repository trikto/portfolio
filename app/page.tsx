import { HomeClient } from "./home-client";
import { LatestArticles } from "./components/articles/latest-articles";
import { getPublishedPosts } from "../lib/blog";

export default function Home() {
  return <HomeClient latestArticles={<LatestArticles posts={getPublishedPosts()} />} />;
}
