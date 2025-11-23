const STORAGE_KEY = "blog:savedPosts";

const readStorage = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeStorage = (items) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
};

export const getSavedPosts = () => readStorage();

export const isSavedPost = (post) => {
  const id = String(post?.id ?? post?.slug ?? "");
  if (!id) return false;
  return readStorage().some((item) => String(item.id ?? item.slug) === id);
};

export const toggleSavedPost = (post) => {
  if (!post) return [];
  const key = String(post.id ?? post.slug ?? "");
  const existing = readStorage();
  const next = existing.some((item) => String(item.id ?? item.slug) === key)
    ? existing.filter((item) => String(item.id ?? item.slug) !== key)
    : [
        ...existing,
        {
          id: post.id ?? post.slug ?? key,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          coverImageUrl: post.coverImageUrl,
          authorName: post.authorName,
          publishedAt: post.publishedAt,
          category: post.category,
          tags: post.tags,
        },
      ];
  writeStorage(next);
  return next;
};

export const clearSavedPost = (idOrSlug) => {
  const key = String(idOrSlug ?? "");
  const next = readStorage().filter((item) => String(item.id ?? item.slug) !== key);
  writeStorage(next);
  return next;
};
