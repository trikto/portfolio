/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentPropsWithoutRef } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { BackToTop } from "../../components/back-to-top";
import { ArticlesGrid } from "../../components/articles/articles-grid";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { getPostBySlug, getPublishedPosts, getRelatedPosts } from "../../../lib/blog";
import { absoluteUrl } from "../../../lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedPosts().map(({ slug }) => ({ slug }));
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post || post.draft) return {};
  const pathname = `/blog/${post.slug}`;
  const image = post.coverImage ? absoluteUrl(post.coverImage) : undefined;
  return {
    title: `${post.title} | Gajan`,
    description: post.description,
    keywords: post.tags,
    alternates: { canonical: pathname },
    authors: [{ name: post.author, url: absoluteUrl("/") }],
    openGraph: {
      type: "article",
      siteName: "Gajan.dev",
      title: post.title,
      description: post.description,
      url: absoluteUrl(pathname),
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.author],
      tags: post.tags,
      ...(image ? { images: [{ url: image, alt: post.title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: post.title,
      description: post.description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

const mdxComponents = {
  a: (props: ComponentPropsWithoutRef<"a">) => <a {...props} rel={props.href?.startsWith("http") ? "noopener noreferrer" : undefined} />,
  img: (props: ComponentPropsWithoutRef<"img">) => <img {...props} alt={props.alt ?? ""} loading="lazy" />,
};

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post || post.draft) notFound();
  const related = getRelatedPosts(post);
  const articleUrl = absoluteUrl(`/blog/${post.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { "@type": "Person", name: post.author, url: absoluteUrl("/") },
    ...(post.coverImage ? { image: absoluteUrl(post.coverImage) } : {}),
    mainEntityOfPage: articleUrl,
    url: articleUrl,
    ...(post.tags.length ? { keywords: post.tags.join(", ") } : {}),
  };
  const content = await MDXRemote({ source: post.content, options: { mdxOptions: { remarkPlugins: [remarkGfm] } }, components: mdxComponents });

  return <main id="site-top" className="site concept-cloud blog-page article-page"><div className="utility"><span className="pulse" /> DEVOPS FIELD NOTES</div><SiteHeader /><article className="article-shell"><header className="article-header"><Link className="article-back" href="/blog">← Back to articles</Link><div className="article-meta"><time dateTime={post.publishedAt}>{displayDate(post.publishedAt)}</time><span>{post.readingMinutes} min read</span>{post.updatedAt && post.updatedAt !== post.publishedAt ? <span>Updated {displayDate(post.updatedAt)}</span> : null}</div><h1>{post.title}</h1><p>{post.description}</p>{post.tags.length ? <div className="article-tags" aria-label="Article topics">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}{post.coverImage ? <div className="article-hero-image"><img alt={`${post.title} cover`} src={post.coverImage} /></div> : null}</header><div className="article-prose">{content}</div><footer className="article-footer"><div><span>Written by</span><strong>{post.author}</strong></div>{post.mediumUrl ? <a href={post.mediumUrl} target="_blank" rel="noopener noreferrer">Also available on Medium ↗</a> : null}</footer></article>{related.length ? <section className="article-related" aria-labelledby="related-title"><p className="eyebrow">KEEP READING</p><h2 id="related-title">Related articles</h2><ArticlesGrid articles={related} /></section> : null}<SiteFooter /><BackToTop /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c") }} /></main>;
}
