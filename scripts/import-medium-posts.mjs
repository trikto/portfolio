import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import { load } from "cheerio";
import { XMLParser } from "fast-xml-parser";
import matter from "gray-matter";
import TurndownService from "turndown";
import turndownPluginGfm from "turndown-plugin-gfm";

const { gfm } = turndownPluginGfm;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDirectory = path.join(root, "content", "blog");
const publicBlogDirectory = path.join(root, "public", "blog");
const manifestPath = path.join(root, "data", "articles.json");
const feedUrl = "https://trikto.medium.com/feed";
const expectedCount = 13;
const overwrite = process.argv.includes("--overwrite");
const exportFlag = process.argv.indexOf("--export");
const exportPath = exportFlag >= 0 ? process.argv[exportFlag + 1] : undefined;
const userAgent = "gajan.dev Medium migration";
const xmlParser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: true });
const fallbackTags = {
  "linux-not-suspending-issue-fixed-ca2b943c59df": ["Linux", "ACPI", "Troubleshooting"],
  "md5-explained-how-md5-works-3e66a4015e2d": ["MD5", "Cryptography", "Hashing"],
  "how-to-obfuscate-url-form-data-parameters-to-bypass-waf-for-sql-injections-57c9c5f8169b": ["Web Security", "SQL Injection", "WAF"],
};
let feedPromise;

function text(value) {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (value && typeof value === "object" && "#text" in value) return text(value["#text"]);
  return "";
}

function list(value) {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function cleanUrl(value) {
  const url = new URL(value);
  for (const key of [...url.searchParams.keys()]) {
    if (["source", "gi", "sk", "ref"].includes(key) || key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
  }
  return url.toString().replace(/\?$/, "");
}

function stableImageUrl(value) {
  try {
    const url = new URL(value);
    const image = url.pathname.match(/\/(1\*[^/]+\.(?:avif|gif|jpe?g|png|webp))$/i)?.[1];
    return image && /medium\.com$/i.test(url.hostname) ? `https://cdn-images-1.medium.com/max/1024/${image}` : url.toString();
  } catch {
    return value;
  }
}

function cleanText(value) {
  return value.replace(/\s+/g, " ").replace(/\s+([,.;!?])/g, "$1").trim();
}

function repairMojibake(value) {
  const replacements = new Map([
    ["\u00c2\u00a0", " "],
    ["\u00e2\u20ac\u00a6", "…"],
    ["\u00e2\u20ac\u2122", "’"],
    ["\u00e2\u20ac\u0153", "“"],
    ["\u00e2\u20ac\u009d", "”"],
    ["\u00e2\u20ac\u0152", "Œ"],
    ["\u00e2\u20ac\u201c", "–"],
    ["\u00e2\u20ac\u201d", "—"],
    ["\u00e2\u20ac\u0160", " "],
    ["\u00e2\u2020\u2019", "→"],
    ["\u00e2\u2020\u2014", "↗"],
    ["\u00e2\u2020\u0153", "↓"],
  ]);
  for (const [broken, corrected] of replacements) value = value.replaceAll(broken, corrected);
  return value.replaceAll("\u00c2", "");
}

function excerpt(value, length = 190) {
  const cleaned = cleanText(value);
  if (cleaned.length <= length) return cleaned;
  const cut = cleaned.slice(0, length + 1);
  const end = cut.lastIndexOf(" ");
  return `${cut.slice(0, end > length / 2 ? end : length).trim()}…`;
}

function dateOnly(value, fallback) {
  const date = new Date(value || fallback);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid article date: ${value || fallback}`);
  return date.toISOString().slice(0, 10);
}

function bodyWordCount(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/[#>*_[\]()|~-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function substantial(markdown) {
  const plain = markdown.replace(/[#>*_`[\]()|~-]/g, "").replace(/\s+/g, " ").trim();
  return plain.length >= 400 && bodyWordCount(markdown) >= 75 && markdown.split(/\n\s*\n/).filter(Boolean).length >= 2;
}

function makeMdxSafe(markdown) {
  return markdown
    .split(/(```[\s\S]*?```|`[^`\n]+`)/g)
    .map((segment, index) => {
      if (index % 2 === 1) return segment;
      return segment
        .replace(/<>/g, "&lt;&gt;")
        .replace(/<([A-Za-z_][A-Za-z0-9_\\-]*)>/g, "&lt;$1&gt;")
        .replaceAll("{", "&#123;")
        .replaceAll("}", "&#125;");
    })
    .join("");
}

function parseStructuredData($) {
  for (const element of $('script[type="application/ld+json"]').toArray()) {
    try {
      const value = JSON.parse($(element).text());
      const entries = Array.isArray(value) ? value : value["@graph"] ?? [value];
      const article = entries.find((entry) => ["Article", "BlogPosting", "SocialMediaPosting"].includes(entry?.["@type"]));
      if (article) return article;
    } catch {
      // Ignore unrelated malformed structured data.
    }
  }
  return {};
}

function bodyRoot($, kind) {
  if (kind !== "html") return $("article").first();
  const parents = [];
  $("p.pw-post-body-paragraph").each((_, paragraph) => {
    const parent = $(paragraph).parent().get(0);
    if (parent && !parents.includes(parent)) parents.push(parent);
  });
  if (!parents.length) return null;

  $("body").append('<div id="medium-import-body"></div>');
  const result = $("#medium-import-body");
  for (const parent of parents) {
    $(parent).children().each((_, child) => result.append($(child).clone()));
  }
  result.children().filter((_, child) => $(child).find('[data-testid="storyTitle"]').length > 0).remove();
  return result;
}

function bestImageUrl($, image) {
  const picture = $(image).closest("picture");
  const srcset =
    $(image).attr("srcset") ||
    picture.find('source[data-testid="og"]').attr("srcset") ||
    picture.find("source").first().attr("srcset");
  if (srcset) {
    const candidates = srcset
      .split(",")
      .map((candidate) => candidate.trim().split(/\s+/))
      .map(([url, width]) => ({ url, width: Number.parseInt(width, 10) || 0 }))
      .filter(({ url }) => url);
    candidates.sort((left, right) => right.width - left.width);
    if (candidates[0]) return candidates[0].url;
  }
  return $(image).attr("data-src") || $(image).attr("src");
}

function meaningfulAlt(value) {
  const cleaned = cleanText(value || "");
  return /press enter|click to view|image in full size|unknown user/i.test(cleaned) ? "" : cleaned;
}

function extension(contentType, source) {
  const byType = {
    "image/avif": ".avif",
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
  };
  const mediaType = contentType?.split(";")[0].trim().toLowerCase();
  if (byType[mediaType]) return byType[mediaType];
  const pathname = (() => {
    try {
      return new URL(source).pathname;
    } catch {
      return source;
    }
  })();
  const candidate = path.extname(pathname).toLowerCase();
  return [".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"].includes(candidate) ? (candidate === ".jpeg" ? ".jpg" : candidate) : ".jpg";
}

async function fetchBuffer(source) {
  const response = await fetch(source, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(45_000) });
  if (!response.ok) throw new Error(`Image returned ${response.status}: ${source}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) throw new Error(`Expected an image but received ${contentType || "unknown content"}: ${source}`);
  return { buffer: Buffer.from(await response.arrayBuffer()), contentType };
}

async function loadDirectoryFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await loadDirectoryFiles(fullPath)));
    else files.push(fullPath);
  }
  return files;
}

async function loadMediumExport(sourcePath) {
  if (!sourcePath) return null;
  const resolved = path.resolve(sourcePath);
  if (!existsSync(resolved)) throw new Error(`Medium export not found: ${resolved}`);
  const sourceStat = await stat(resolved);

  if (sourceStat.isDirectory()) {
    const files = await loadDirectoryFiles(resolved);
    const htmlFiles = files.filter((file) => file.toLowerCase().endsWith(".html"));
    return {
      async article(slug) {
        const id = slug.slice(-12);
        const file = htmlFiles.find((candidate) => path.basename(candidate).toLowerCase().includes(id) || path.basename(candidate).toLowerCase().includes(slug));
        if (!file) return null;
        return {
          html: await readFile(file, "utf8"),
          async asset(source) {
            const assetPath = path.resolve(path.dirname(file), decodeURIComponent(source));
            const relative = path.relative(resolved, assetPath);
            if (relative.startsWith("..") || path.isAbsolute(relative) || !existsSync(assetPath)) throw new Error(`Export image not found: ${source}`);
            return { buffer: await readFile(assetPath), contentType: undefined };
          },
        };
      },
    };
  }

  const zip = new AdmZip(resolved);
  const entries = zip.getEntries();
  const htmlEntries = entries.filter((entry) => !entry.isDirectory && entry.entryName.toLowerCase().endsWith(".html"));
  return {
    async article(slug) {
      const id = slug.slice(-12);
      const entry = htmlEntries.find((candidate) => candidate.entryName.toLowerCase().includes(id) || candidate.entryName.toLowerCase().includes(slug));
      if (!entry) return null;
      return {
        html: entry.getData().toString("utf8"),
        async asset(source) {
          const entryName = path.posix.normalize(path.posix.join(path.posix.dirname(entry.entryName), decodeURIComponent(source).replaceAll("\\", "/")));
          const asset = zip.getEntry(entryName);
          if (!asset) throw new Error(`Export image not found: ${source}`);
          return { buffer: asset.getData(), contentType: undefined };
        },
      };
    },
  };
}

async function feed() {
  if (!feedPromise) {
    feedPromise = (async () => {
      const response = await fetch(feedUrl, {
        headers: { Accept: "application/rss+xml", "User-Agent": userAgent },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`Medium RSS returned ${response.status}.`);
      const document = xmlParser.parse(await response.text());
      const items = list(document?.rss?.channel?.item);
      return new Map(
        items.map((item) => {
          const url = text(item.link);
          const slug = new URL(url).pathname.split("/").filter(Boolean).at(-1);
          return [
            slug,
            {
              html: text(item["content:encoded"]) || text(item.description),
              tags: list(item.category).map(text).filter(Boolean),
              publishedAt: text(item.pubDate),
            },
          ];
        }),
      );
    })();
  }
  return feedPromise;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { Accept: "text/html", "User-Agent": userAgent },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Medium returned ${response.status}: ${url}`);
  return { html: await response.text(), finalUrl: response.url };
}

async function sourceFor(article, mediumExport) {
  const failures = [];
  try {
    const direct = await fetchHtml(cleanUrl(article.url));
    try {
      const item = (await feed()).get(article.slug);
      if (item?.html) return { ...direct, ...item, pageHtml: direct.html, kind: "rss", source: "direct+rss" };
    } catch {
      // The direct page remains a complete source when RSS is unavailable.
    }
    return { ...direct, kind: "html", source: "direct" };
  } catch (error) {
    failures.push(`direct: ${error.message}`);
  }

  try {
    const item = (await feed()).get(article.slug);
    if (item?.html) return { ...item, kind: "rss", finalUrl: cleanUrl(article.url), source: "rss" };
    failures.push("rss: article not present");
  } catch (error) {
    failures.push(`rss: ${error.message}`);
  }

  try {
    return { ...(await fetchHtml(`https://trikto.medium.com/${article.slug}`)), kind: "html", source: "profile" };
  } catch (error) {
    failures.push(`profile: ${error.message}`);
  }

  const exported = await mediumExport?.article(article.slug);
  if (exported) return { ...exported, kind: "export", finalUrl: cleanUrl(article.url), source: "export" };
  failures.push("export: article not present");
  throw new Error(failures.join("; "));
}

async function convertArticle(article, source) {
  const page$ = load(source.pageHtml || source.html);
  const $ = source.kind === "rss" ? load(`<article>${source.html}</article>`) : page$;
  const structured = parseStructuredData(page$);
  const body = bodyRoot($, source.kind === "rss" || source.kind === "export" ? "document" : "html");
  if (!body?.length) throw new Error("Could not locate substantial article body markup.");

  body.find("script,style,button,svg,noscript").remove();
  body.find("a").each((_, link) => {
    const href = $(link).attr("href");
    if (!href) return;
    try {
      $(link).attr("href", cleanUrl(new URL(href, source.finalUrl).toString()));
    } catch {
      $(link).removeAttr("href");
    }
  });

  const firstParagraph = cleanText(body.find("p.pw-post-body-paragraph,p").first().text());
  const title = cleanText(structured.headline || page$('[data-testid="storyTitle"]').first().text() || article.title);
  const description = excerpt(
    body.find(".pw-subtitle-paragraph").first().text() ||
      firstParagraph ||
      structured.description ||
      article.description,
  );
  const publishedAt = dateOnly(structured.datePublished || source.publishedAt, article.publishedAt);
  const updatedAt = dateOnly(structured.dateModified || structured.datePublished || source.publishedAt, article.publishedAt);
  const pageTags = [
    ...page$("[aria-label]").map((_, element) => page$(element).attr("aria-label")).get()
      .filter((label) => label?.startsWith("Topic:"))
      .map((label) => cleanText(label.slice(6))),
    ...page$('article a[href*="/tag/"]').map((_, link) => cleanText(page$(link).text())).get(),
  ];
  const extractedTags = [...(source.tags || []), ...(article.categories || []), ...pageTags]
    .filter(Boolean)
    .filter((tag, index, values) => values.findIndex((value) => value.toLowerCase() === tag.toLowerCase()) === index);
  const tags = extractedTags.length ? extractedTags : fallbackTags[article.slug] || ["Technology"];

  const imageDirectory = path.join(publicBlogDirectory, article.slug);
  await mkdir(imageDirectory, { recursive: true });
  const downloaded = new Map();
  const usedFiles = new Set();
  let imageNumber = 0;

  async function localImage(remoteSource, preferredName, assetLoader) {
    const absoluteSource = stableImageUrl((() => {
      try {
        return new URL(remoteSource, source.finalUrl).toString();
      } catch {
        return remoteSource;
      }
    })());
    const key = (() => {
      if (!absoluteSource.startsWith("http")) return absoluteSource;
      const url = new URL(cleanUrl(absoluteSource));
      const mediumImage = url.pathname.match(/\/(1\*[^/]+)/)?.[1];
      return mediumImage ? `${url.hostname}/${mediumImage}` : url.toString();
    })();
    if (downloaded.has(key)) return downloaded.get(key);
    const asset = absoluteSource.startsWith("http") ? await fetchBuffer(absoluteSource) : await assetLoader?.(remoteSource);
    if (!asset) throw new Error(`Cannot load image: ${remoteSource}`);
    const ext = extension(asset.contentType, remoteSource);
    const fileName = `${preferredName}${ext}`;
    await writeFile(path.join(imageDirectory, fileName), asset.buffer);
    usedFiles.add(fileName);
    const localPath = `/blog/${article.slug}/${fileName}`;
    downloaded.set(key, localPath);
    return localPath;
  }

  const coverSource = page$('meta[property="og:image"]').attr("content") || article.image || bestImageUrl($, body.find("img").first());
  let coverImage;
  if (coverSource) coverImage = await localImage(coverSource, "cover", source.asset);

  for (const image of body.find("img").toArray()) {
    const remoteSource = bestImageUrl($, image);
    if (!remoteSource || /medium\.com\/_\/stat/i.test(remoteSource)) {
      const figure = $(image).closest("figure");
      if (figure.length) figure.remove();
      else $(image).remove();
      continue;
    }
    const figure = $(image).closest("figure");
    const caption = meaningfulAlt(figure.find("figcaption").text());
    const alt = meaningfulAlt($(image).attr("alt")) || caption || `${title} image ${imageNumber + 1}`;
    const localPath = await localImage(remoteSource, `image-${String(++imageNumber).padStart(2, "0")}`, source.asset);
    $(image).attr({ src: localPath, alt }).removeAttr("srcset").removeAttr("sizes").removeAttr("class").removeAttr("loading");
    const allElements = body.find("*").toArray();
    const beforeFirstParagraph =
      figure.length &&
      allElements.indexOf(figure.get(0)) < allElements.indexOf(body.find("p.pw-post-body-paragraph,p").first().get(0));
    if (coverImage === localPath && beforeFirstParagraph) {
      figure.remove();
      continue;
    }
    figure.find("figcaption").each((_, element) => {
      const value = meaningfulAlt($(element).text());
      if (value) $(element).replaceWith(`<p><em>${value}</em></p>`);
      else $(element).remove();
    });
  }

  const turndown = new TurndownService({
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    headingStyle: "atx",
    strongDelimiter: "**",
  });
  turndown.use(gfm);
  turndown.addRule("fencedCode", {
    filter: "pre",
    replacement(content, node) {
      const code = load(node.innerHTML.replace(/<br\s*\/?>/gi, "\n"), null, false).text().replace(/^\n+|\n+$/g, "");
      return `\n\n\`\`\`\n${code}\n\`\`\`\n\n`;
    },
  });
  turndown.addRule("localImages", {
    filter: "img",
    replacement(_content, node) {
      const src = node.getAttribute("src");
      if (!src) return "";
      const alt = (node.getAttribute("alt") || "").replaceAll("[", "\\[").replaceAll("]", "\\]");
      return `![${alt}](${src})`;
    },
  });
  const markdown = makeMdxSafe(repairMojibake(turndown
    .turndown(body.html() || "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*--\s*$/gm, "")
    .split("\n")
    .filter((line) => {
      const plain = line.replace(/^>\s*/, "").replace(/^#{1,6}\s*/, "").replace(/[*_]/g, "").trim();
      return !/^(Press enter or click to view image in full size|Get Trikto.?s stories in\s*your\s*inbox|Join Medium for free to get updates from\s*this\s*writer\.?|Remember me for faster sign in|Listen|Share)$/i.test(plain);
    })
    .join("\n")
    .trim()));
  if (!substantial(markdown)) throw new Error(`Imported body is too small (${bodyWordCount(markdown)} words, ${markdown.length} characters).`);
  if (overwrite) {
    for (const fileName of await readdir(imageDirectory)) {
      if (!usedFiles.has(fileName)) await rm(path.join(imageDirectory, fileName), { force: true });
    }
  }

  return { title, description, publishedAt, updatedAt, tags, coverImage, markdown };
}

function frontmatter(article, converted) {
  const lines = [
    "---",
    `title: ${JSON.stringify(converted.title)}`,
    `description: ${JSON.stringify(converted.description)}`,
    `publishedAt: ${JSON.stringify(converted.publishedAt)}`,
    `updatedAt: ${JSON.stringify(converted.updatedAt)}`,
    'author: "Gajan Rajah"',
    ...(converted.tags.length ? ["tags:", ...converted.tags.map((tag) => `  - ${JSON.stringify(tag)}`)] : ["tags: []"]),
    ...(converted.coverImage ? [`coverImage: ${JSON.stringify(converted.coverImage)}`] : []),
    `mediumUrl: ${JSON.stringify(cleanUrl(article.url))}`,
    "draft: false",
    "---",
    "",
    converted.markdown,
    "",
  ];
  return lines.join("\n");
}

async function verify(manifest) {
  const files = (await readdir(contentDirectory)).filter((file) => file.endsWith(".mdx") && file !== "_template.mdx");
  if (files.length !== expectedCount) throw new Error(`Expected ${expectedCount} MDX articles after import, found ${files.length}.`);
  for (const article of manifest) {
    const filePath = path.join(contentDirectory, `${article.slug}.mdx`);
    if (!existsSync(filePath)) throw new Error(`Missing imported article: ${article.slug}.mdx`);
    const parsed = matter(await readFile(filePath, "utf8"));
    if (!substantial(parsed.content)) throw new Error(`${article.slug}.mdx does not contain substantial body content.`);
    if (/!\[[^\]]*]\(https?:\/\/[^)]*(?:medium\.com|medium\.com\/)[^)]*\)|<img[^>]+src=["']https?:\/\/[^"']*medium\.com/i.test(parsed.content)) {
      throw new Error(`${article.slug}.mdx still hotlinks a Medium image.`);
    }
    const localImages = [...parsed.content.matchAll(/!\[[^\]]*]\((\/blog\/[^)]+)\)/g)].map((match) => match[1]);
    if (parsed.data.coverImage) localImages.push(parsed.data.coverImage);
    for (const image of new Set(localImages)) {
      if (!existsSync(path.join(root, "public", image))) throw new Error(`${article.slug}.mdx references missing image ${image}.`);
    }
  }
}

function shouldSkipExisting(destination, overwriteEnabled = overwrite) {
  return !overwriteEnabled && existsSync(destination);
}

async function main() {
  if (exportFlag >= 0 && !exportPath) throw new Error("--export requires a ZIP file or directory path.");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.length !== expectedCount || new Set(manifest.map((article) => article.slug)).size !== expectedCount) {
    throw new Error(`Import manifest must contain exactly ${expectedCount} unique articles.`);
  }
  await mkdir(contentDirectory, { recursive: true });
  await mkdir(publicBlogDirectory, { recursive: true });
  const mediumExport = await loadMediumExport(exportPath);
  const failures = [];

  for (const article of manifest) {
    const destination = path.join(contentDirectory, `${article.slug}.mdx`);
    if (shouldSkipExisting(destination)) {
      console.log(`SKIP ${article.slug}: article already exists.`);
      continue;
    }
    try {
      const source = await sourceFor(article, mediumExport);
      const converted = await convertArticle(article, source);
      await writeFile(destination, frontmatter(article, converted), "utf8");
      console.log(`IMPORTED ${article.slug} from ${source.source}.`);
    } catch (error) {
      failures.push(`${article.slug}: ${error.message}`);
      console.error(`FAILED ${article.slug}: ${error.message}`);
    }
  }

  try {
    await verify(manifest);
  } catch (error) {
    failures.push(`verification: ${error.message}`);
  }
  if (failures.length) throw new Error(`Medium import failed:\n- ${failures.join("\n- ")}`);
  console.log(`Verified ${expectedCount} substantial local MDX articles.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

export { loadMediumExport, shouldSkipExisting, substantial };
