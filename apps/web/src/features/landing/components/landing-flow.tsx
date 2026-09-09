const steps = [
  {
    title: 'Print for the week',
    body: 'Choose your timetable and print a planner with space for each subject.',
  },
  {
    title: 'Write in class',
    body: 'Record the assignment and its due date on paper. No device needed at school.',
  },
  {
    title: 'Scan when you get home',
    body: 'Photograph the page or use a scanner before you start planning homework.',
  },
  {
    title: 'Check and save',
    body: 'Compare the results with your paper, confirm deadlines, and sync to your chosen destination.',
  },
];

export const LandingFlow = () => (
  <section className="border-hairline border-y bg-paper-deep">
    <div className="shell py-12">
      <h2>A daily handoff.</h2>
      <ol className="mt-8 grid list-decimal gap-8 pl-5 md:grid-cols-4">
        {steps.map((step) => (
          <li key={step.title} className="pl-2">
            <h3 className="text-xl">{step.title}</h3>
            <p className="mt-3 text-ink-soft">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);
