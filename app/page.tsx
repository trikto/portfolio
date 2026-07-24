import { HomeClient } from "./home-client";
import { PageReadingProgress } from "./components/article-reading-progress";
import { LatestArticles } from "./components/articles/latest-articles";
import { getPublishedPosts } from "../lib/blog";

export default function Home() {
  return <><PageReadingProgress /><HomeClient latestArticles={<LatestArticles posts={getPublishedPosts()} />} /></>;
}
