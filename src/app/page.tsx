export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="mb-3 text-sm uppercase tracking-[0.3em] text-neutral-400">
        Save the date
      </p>
      <h1 className="text-6xl font-bold tracking-tight sm:text-8xl">
        Hausfest <span className="text-amber-400">26</span>
      </h1>
      <p className="mt-6 max-w-md text-balance text-lg text-neutral-300">
        Bald gibt&apos;s hier mehr Infos. Datum, Ort, Programm — alles kommt.
      </p>
    </main>
  );
}
