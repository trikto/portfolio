import assert from "node:assert/strict";
import test from "node:test";
import catalogData from "../data/articles.json" with { type: "json" };
import { mergeArticles, parseMediumFeed } from "../lib/medium.ts";
import type { Article } from "../types/article.ts";

const catalog = catalogData as Article[];

test("the Medium export catalog contains 13 selected, unique articles and no comments", () => {
  assert.equal(catalog.length, 13);
  assert.equal(new Set(catalog.map((article) => article.slug)).size, 13);
  assert.equal(catalog.filter((article) => !article.image).length, 0);
  const commentSlugs = [
    "well-religion-and-logic-never-coexist-do-they-4a0e241af1d4",
    "a-secret-that-the-htpasswd-identity-provider-uses-requires-adding-the-htpasswd-prefix-before-8f70269b16f3",
    "damn-bro-5db226f346fd",
    "this-works-and-thanks-a-lot-be597d5fa9b6",
  ];
  assert.ok(commentSlugs.every((slug) => !catalog.some((article) => article.slug === slug)));
  assert.ok(!catalog.some((article) => article.slug === "what-is-the-meaning-of-life-a-new-perspective-to-start-living-62dd1434ae57"));

  for (const article of catalog) {
    assert.ok(article.title);
    assert.ok(article.description);
    assert.match(article.slug, /^[a-z0-9][a-z0-9-]*$/i);
    assert.equal(new URL(article.url).protocol, "https:");
    assert.ok(Number.isFinite(Date.parse(article.publishedAt)));
  }

  assert.deepEqual(catalog, [...catalog].sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt)));
});

test("normalizes, validates, and sorts Medium RSS articles", () => {
  const longBody = Array.from({ length: 401 }, () => "word").join(" ");
  const feed = `<?xml version="1.0"?><rss xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel>
    <item><title>Older &amp; Stable</title><link>https://trikto.medium.com/older-stable-def456?source=rss</link><pubDate>Tue, 14 Jul 2026 08:00:00 GMT</pubDate><category>Linux</category><content:encoded><![CDATA[<figure><img src="https://miro.medium.com/v2/example.png"></figure><p>${longBody}</p>]]></content:encoded></item>
    <item><title>Newest Article</title><link>https://trikto.medium.com/newest-article-abc123</link><pubDate>Wed, 15 Jul 2026 09:30:00 GMT</pubDate><content:encoded><![CDATA[<p>Short &amp; useful.</p>]]></content:encoded></item>
    <item><title>Missing date</title><link>https://trikto.medium.com/invalid-entry-000000</link></item>
  </channel></rss>`;

  const articles = parseMediumFeed(feed);
  assert.equal(articles.length, 2);
  assert.equal(articles[0].title, "Newest Article");
  assert.equal(articles[0].slug, "newest-article-abc123");
  assert.equal(articles[0].image, undefined);
  assert.equal(articles[1].title, "Older & Stable");
  assert.equal(articles[1].slug, "older-stable-def456");
  assert.equal(articles[1].image, "https://miro.medium.com/v2/example.png");
  assert.equal(articles[1].readingTime, "3 min read");
  assert.deepEqual(articles[1].categories, ["Linux"]);
  assert.match(articles[1].description, /…$/);
});

test("merges new feed entries without losing saved metadata or old articles", () => {
  const saved: Article = {
    title: "Saved title",
    description: "Saved description",
    url: "https://trikto.medium.com/saved-article-abc123",
    slug: "saved-article-abc123",
    image: "https://miro.medium.com/saved.png",
    publishedAt: "2025-01-01T00:00:00.000Z",
    readingTime: "4 min read",
    categories: ["DevOps"],
  };
  const incoming: Article = {
    title: "Updated title",
    description: "Read the full article on Medium.",
    url: "https://trikto.medium.com/saved-article-abc123?source=rss",
    slug: saved.slug,
    publishedAt: "2026-01-01T00:00:00.000Z",
  };
  const newlyPublished: Article = {
    title: "New article",
    description: "New description",
    url: "https://trikto.medium.com/new-article-def456",
    slug: "new-article-def456",
    publishedAt: "2026-02-01T00:00:00.000Z",
  };

  const persisted = mergeArticles([saved], [incoming, newlyPublished]);
  const updated = persisted.find((article) => article.slug === saved.slug);
  assert.equal(persisted.length, 2);
  assert.equal(updated?.title, "Updated title");
  assert.equal(updated?.description, saved.description);
  assert.equal(updated?.image, saved.image);
  assert.equal(updated?.readingTime, saved.readingTime);
  assert.deepEqual(updated?.categories, saved.categories);

  const afterFeedRemoval = mergeArticles(persisted, []);
  assert.deepEqual(afterFeedRemoval, persisted);
  assert.ok(afterFeedRemoval.some((article) => article.slug === newlyPublished.slug));
});

test("accepts an empty feed and rejects malformed input without mutating saved data", () => {
  const before = structuredClone(catalog);
  assert.deepEqual(parseMediumFeed("<rss><channel /></rss>"), []);
  assert.throws(() => parseMediumFeed("<not-rss />"), /RSS channel/);
  assert.deepEqual(catalog, before);
});
