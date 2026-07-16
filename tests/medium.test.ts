import assert from "node:assert/strict";
import test from "node:test";
import { parseMediumFeed } from "../lib/medium.ts";

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

test("accepts an empty feed and rejects a malformed feed", () => {
  assert.deepEqual(parseMediumFeed("<rss><channel /></rss>"), []);
  assert.throws(() => parseMediumFeed("<not-rss />"), /RSS channel/);
});
