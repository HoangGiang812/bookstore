export default function SectionHeader({ title, subtitle, to }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {to && <a href={to} className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted">Xem tất cả</a>}
    </div>
  );
}
