export type Article = {
  title: string;
  description: string;
  url: string;
  slug: string;
  image?: string;
  publishedAt: string;
  readingTime?: string;
  categories?: string[];
};

export type ArticleFeed = {
  articles: Article[];
  source: "medium" | "fallback";
};
