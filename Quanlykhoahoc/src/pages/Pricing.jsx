import React from "react";
import { Link } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";

function PriceCard({ planKey, name, price, features, highlighted }) {
  return (
    <div className={`rounded-2xl border ${highlighted ? "border-primary-300" : "border-stone-200"} p-6 bg-white ${highlighted ? "shadow-md" : ""}`}>
      <div className="text-sm text-stone-600">Gói</div>
      <div className="mt-1 text-xl font-semibold text-stone-900">{name}</div>
      <div className="mt-4 text-3xl font-bold text-stone-900">{price}<span className="text-base font-medium text-stone-500">/tháng</span></div>
      <ul className="mt-4 space-y-2 text-sm text-stone-600">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary-600"></span>{f}</li>
        ))}
      </ul>
      <Link to={`/checkout?plan=${planKey}`} className={`btn w-full mt-5 ${highlighted ? "btn-primary" : "border-stone-300 hover:border-stone-400"}`}>Chọn gói</Link>
    </div>
  );
}

export default function Pricing() {
  const plans = [
    { planKey: "basic", name: "Cơ bản", price: "199k", features: ["Truy cập khoá học cơ bản", "Hỗ trợ cộng đồng"] },
    { planKey: "pro", name: "Pro", price: "399k", features: ["Tất cả khoá học", "Mentor hỗ trợ", "Review bài tập"], highlighted: true },
    { planKey: "enterprise", name: "Doanh nghiệp", price: "Liên hệ", features: ["Tuỳ chỉnh lộ trình", "Báo cáo tiến độ", "Workshop nội bộ"] },
  ];
  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <SectionHeading
          eyebrow="Bảng giá"
          title="Chọn gói học phù hợp"
          subtitle="Linh hoạt theo mục tiêu và ngân sách của bạn"
          center
        />
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <PriceCard key={p.name} {...p} />
          ))}
        </div>
      </div>
    </div>
  );
}
