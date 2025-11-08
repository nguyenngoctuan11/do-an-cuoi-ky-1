import React from "react";
import SectionHeading from "../components/SectionHeading";

function PostCard({ title, excerpt }) {
  return (
    <article className="rounded-2xl overflow-hidden border border-stone-200 bg-white hover:shadow-md transition">
      <div className="aspect-video bg-gradient-to-br from-primary-100 to-stone-100" />
      <div className="p-4">
        <h3 className="font-semibold text-stone-900 hover:text-primary-700 cursor-pointer">{title}</h3>
        <p className="mt-2 text-stone-600 text-sm">{excerpt}</p>
      </div>
    </article>
  );
}

export default function Blog() {
  const posts = Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    title: `Kỹ năng lập trình #${i + 1}`,
    excerpt: "Những mẹo thực tế giúp bạn học nhanh và hiệu quả hơn.",
  }));
  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <SectionHeading
          eyebrow="Blog"
          title="Chia sẻ kiến thức và kinh nghiệm"
          subtitle="Cập nhật xu hướng, mẹo thực hành và câu chuyện nghề nghiệp"
          center
        />
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p) => (
            <PostCard key={p.id} title={p.title} excerpt={p.excerpt} />
          ))}
        </div>
      </div>
    </div>
  );
}

