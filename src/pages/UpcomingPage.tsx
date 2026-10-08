interface UpcomingPageProps {
  eyebrow: string;
  title: string;
  phase: string;
  items: string[];
}

export default function UpcomingPage({ eyebrow, title, phase, items }: UpcomingPageProps) {
  return (
    <>
      <header className="page__header">
        <span className="page__eyebrow">{eyebrow}</span>
        <h1 className="page__title">{title}</h1>
      </header>
      <section className="upcoming">
        <span className="upcoming__badge">{phase}</span>
        <h2 className="upcoming__title">Em construção</h2>
        <ul className="upcoming__list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
