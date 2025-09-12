import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

export type Article = CollectionEntry<"articles">;

export async function getPublishedArticles(): Promise<Article[]> {
  const articles = await getCollection("articles", ({ data }) => {
    return data.draft !== true;
  });

  return articles.sort((a, b) => {
    const dateA = a.data.publishDate || new Date(0);
    const dateB = b.data.publishDate || new Date(0);
    return dateB.getTime() - dateA.getTime(); // Sort by newest first
  });
}

export async function getFeaturedArticles(): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles.filter((article) => article.data.featured);
}

export async function getArticlesByTag(tag: string): Promise<Article[]> {
  const articles = await getPublishedArticles();
  return articles.filter((article) => (article.data.tags ?? []).includes(tag));
}

export function getAllTags(articles: Article[]): string[] {
  const tags = new Set<string>();
  articles.forEach((article) => {
    (article.data.tags ?? []).forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
}
