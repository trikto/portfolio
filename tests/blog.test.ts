import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import AdmZip from "adm-zip";
import catalogData from "../data/articles.json" with { type: "json" };
import {
  calculateReadingMinutes,
  getAllPosts,
  getAllPostSlugs,
  getPostBySlug,
  getPublishedPosts,
  getRelatedPosts,
  parseBlogPostSource,
  type BlogPost,
} from "../lib/blog.ts";
import { loadMediumExport, shouldSkipExisting, substantial } from "../scripts/import-medium-posts.mjs";

const catalog = catalogData as Array<{ slug: string; title: string }>;

test("article prose keeps Markdown list markers", async () => {
  const styles = await readFile(path.join(process.cwd(), "app", "globals.css"), "utf8");
  assert.match(styles, /\.article-prose ul\s*\{\s*list-style\s*:\s*disc/);
  assert.match(styles, /\.article-prose ol\s*\{\s*list-style\s*:\s*decimal/);
});

test("article-page images retain their source proportions while card covers stay fixed", async () => {
  const styles = await readFile(path.join(process.cwd(), "app", "globals.css"), "utf8");
  assert.match(styles, /\.article-hero-image img\s*\{\s*display:block;\s*width:100%;\s*height:auto;/);
  assert.doesNotMatch(styles, /\.article-hero-image\s*\{[^}]*aspect-ratio/);
  assert.doesNotMatch(styles, /\.article-hero-image img\s*\{[^}]*object-fit/);
  assert.match(styles, /\.article-prose img\s*\{[^}]*max-width:100%;\s*height:auto;/);
  assert.match(styles, /\.article-cover\s*\{[^}]*aspect-ratio:16\/9/);
  assert.match(styles, /\.article-cover img\s*\{[^}]*object-fit:cover/);
});

function source(overrides: Record<string, unknown> = {}, body = "A useful local article body.") {
  const values: Record<string, unknown> = {
    title: "Test article",
    description: "A concise description.",
    publishedAt: "2026-07-17",
    author: "Gajan Rajah",
    tags: ["DevOps"],
    draft: false,
    ...overrides,
  };
  const tags = Array.isArray(values.tags)
    ? `\n${values.tags.map((tag) => `  - ${JSON.stringify(tag)}`).join("\n")}`
    : ` ${JSON.stringify(values.tags)}`;
  const optional = ["updatedAt", "coverImage", "mediumUrl"]
    .filter((field) => values[field] !== undefined)
    .map((field) => `${field}: ${JSON.stringify(values[field])}`)
    .join("\n");
  return `---
title: ${JSON.stringify(values.title)}
description: ${JSON.stringify(values.description)}
publishedAt: ${JSON.stringify(values.publishedAt)}
author: ${JSON.stringify(values.author)}
tags:${tags}
${optional ? `${optional}\n` : ""}draft: ${JSON.stringify(values.draft)}
---

${body}
`;
}

test("validates required frontmatter with filename-specific errors", () => {
  assert.equal(parseBlogPostSource("test-post", source()).title, "Test article");
  assert.throws(() => parseBlogPostSource("test-post", source({ title: "" })), /test-post\.mdx.*title/);
  assert.throws(() => parseBlogPostSource("test-post", source({ publishedAt: "2026-02-31" })), /test-post\.mdx.*YYYY-MM-DD/);
  assert.throws(() => parseBlogPostSource("test-post", source({ tags: [] })), /test-post\.mdx.*tags/);
  assert.throws(() => parseBlogPostSource("test-post", source({ draft: "false" })), /test-post\.mdx.*draft/);
  assert.throws(
    () => parseBlogPostSource("test-post", source({ coverImage: "https://miro.medium.com/image.png" })),
    /test-post\.mdx.*local/,
  );
  assert.throws(
    () => parseBlogPostSource("test-post", source({ coverImage: "/blog/test-post/missing.png" })),
    /test-post\.mdx.*missing local file/,
  );
});

test("calculates reading time locally at 200 words per minute", () => {
  assert.equal(calculateReadingMinutes("one two three"), 1);
  assert.equal(calculateReadingMinutes(Array.from({ length: 200 }, () => "word").join(" ")), 1);
  assert.equal(calculateReadingMinutes(Array.from({ length: 201 }, () => "word").join(" ")), 2);
});

test("covers exactly the 13 manifest slugs, sorted newest-first", () => {
  const slugs = getAllPostSlugs();
  const posts = getAllPosts();
  assert.equal(slugs.length, 13);
  assert.equal(new Set(slugs).size, 13);
  assert.deepEqual(new Set(slugs), new Set(catalog.map(({ slug }) => slug)));
  assert.deepEqual(posts.map(({ publishedAt }) => publishedAt), [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).map(({ publishedAt }) => publishedAt));
});

test("published queries exclude drafts and unsafe or missing slugs return null", () => {
  assert.ok(getPublishedPosts().every(({ draft }) => !draft));
  assert.equal(getPostBySlug("../package"), null);
  assert.equal(getPostBySlug("missing-post"), null);
});

test("related articles rank shared tags before publication date", () => {
  const base = parseBlogPostSource("base", source({ tags: ["DevOps", "Linux"] })) as BlogPost;
  const oneNew = parseBlogPostSource("one-new", source({ title: "One new", tags: ["DevOps"], publishedAt: "2026-07-16" })) as BlogPost;
  const twoOld = parseBlogPostSource("two-old", source({ title: "Two old", tags: ["Linux", "DevOps"], publishedAt: "2025-01-01" })) as BlogPost;
  const oneOld = parseBlogPostSource("one-old", source({ title: "One old", tags: ["Linux"], publishedAt: "2024-01-01" })) as BlogPost;
  assert.deepEqual(getRelatedPosts(base, [base, oneOld, oneNew, twoOld]).map(({ slug }) => slug), ["two-old", "one-new", "one-old"]);
});

test("recognizes substantial bodies and rejects thin imports", () => {
  const body = Array.from({ length: 90 }, (_, index) => `paragraph-${index} useful migration content`).join(" ");
  assert.equal(substantial(`${body}\n\nSecond content block.`), true);
  assert.equal(substantial("Short body."), false);
});

test("loads matching articles from extracted directories and ZIP exports", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "medium-export-"));
  try {
    const posts = path.join(temporary, "posts");
    await mkdir(posts);
    const slug = catalog[0].slug;
    const id = slug.slice(-12);
    await writeFile(path.join(posts, `2026-01-01-${id}.html`), "<article><p>Directory body</p></article>");
    const directoryExport = await loadMediumExport(temporary);
    assert.match((await directoryExport?.article(slug))?.html ?? "", /Directory body/);

    const zipPath = path.join(temporary, "medium-export.zip");
    const zip = new AdmZip();
    zip.addFile(`posts/2026-01-01-${id}.html`, Buffer.from("<article><p>ZIP body</p></article>"));
    zip.writeZip(zipPath);
    const zipExport = await loadMediumExport(zipPath);
    assert.match((await zipExport?.article(slug))?.html ?? "", /ZIP body/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("default imports skip existing MDX while overwrite mode replaces it", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "medium-skip-"));
  try {
    const destination = path.join(temporary, "article.mdx");
    assert.equal(shouldSkipExisting(destination, false), false);
    await writeFile(destination, "existing article");
    assert.equal(shouldSkipExisting(destination, false), true);
    assert.equal(shouldSkipExisting(destination, true), false);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
