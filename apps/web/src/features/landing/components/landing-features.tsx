const features = [
  {
    title: 'Your existing tools',
    body: 'Send homework to Super Productivity or keep weekly Markdown notes in an Obsidian vault, locally or through GitHub.',
  },
  {
    title: 'Your timetable',
    body: 'Prepare a weekly sheet with your subjects. Adjust individual days when lessons change.',
  },
  {
    title: 'Your handwriting',
    body: 'Use hosted Gemini, or when self-hosting connect Google with your own key or a local Ollama model. Review the result before saving.',
  },
];
export const LandingFeatures = () => (
  <section className="shell py-12">
    <h2>Fits around your school day.</h2>
    <div className="mt-8 grid gap-8 md:grid-cols-3">
      {features.map((feature) => (
        <article key={feature.title}>
          <h3 className="text-xl">{feature.title}</h3>
          <p className="mt-3 text-ink-soft">{feature.body}</p>
        </article>
      ))}
    </div>
  </section>
);
