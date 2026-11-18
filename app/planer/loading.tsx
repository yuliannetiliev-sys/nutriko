// Страниците на планера са force-dynamic — без това тапът изглежда, сякаш не реагира.
export default function PlanerLoading() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="h-8 w-48 rounded-lg bg-neutral-200" />
      <div className="h-24 rounded-xl bg-neutral-200" />
      <div className="h-24 rounded-xl bg-neutral-200" />
      <div className="h-24 rounded-xl bg-neutral-200" />
    </div>
  );
}
