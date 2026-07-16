import { readFile, writeFile } from "node:fs/promises";
import { MEDIUM_FEED_URL, mergeArticles, parseMediumFeed } from "../lib/medium.ts";
import type { Article } from "../types/article.ts";

const catalogUrl = new URL("../data/articles.json", import.meta.url);

async function syncMediumArticles(): Promise<void> {
  const response = await fetch(MEDIUM_FEED_URL, {
    headers: { Accept: "application/rss+xml, application/xml;q=0.9", "User-Agent": "gajan.dev article sync" },
  });
  if (!response.ok) throw new Error(`Medium feed returned ${response.status}.`);

  const currentText = await readFile(catalogUrl, "utf8");
  const current = JSON.parse(currentText) as Article[];
  const merged = mergeArticles(current, parseMediumFeed(await response.text()));
  const nextText = `${JSON.stringify(merged, null, 2)}\n`;

  if (nextText === currentText) {
    console.log(`Medium catalog is already current (${merged.length} articles).`);
    return;
  }

  await writeFile(catalogUrl, nextText, "utf8");
  console.log(`Updated Medium catalog (${merged.length} articles).`);
}

await syncMediumArticles();
