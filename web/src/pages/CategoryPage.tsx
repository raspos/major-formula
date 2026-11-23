import { Link, useParams } from "react-router-dom";
import { CATEGORIES } from "../categories";

export default function CategoryPage() {
  const { slug } = useParams();
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-charcoal-soft">해당 카테고리를 찾을 수 없습니다.</p>
        <Link className="mt-4 inline-block underline" to="/">첫 화면으로 돌아가기</Link>
      </main>
    );
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <Link to="/" className="text-xs text-charcoal-soft hover:text-green-deep">← 메이저의 공식</Link>
      <div className="mt-8 text-xs font-medium uppercase tracking-[0.24em] text-gold">{category.kicker}</div>
      <h1 className="mt-2 font-serif text-4xl font-bold text-green-deep sm:text-5xl">{category.title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-charcoal-soft">{category.summary}</p>
      <div className="rule my-8" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {category.items.map((item) => (
          <Link key={item.to} to={item.to} className="card card-hover flex min-h-40 flex-col justify-between p-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-green-deep">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-soft">{item.detail}</p>
            </div>
            <span className="mt-5 text-right text-sm font-medium text-gold">살펴보기 →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
