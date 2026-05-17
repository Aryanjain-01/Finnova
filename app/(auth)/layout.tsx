import {
  SparklesIcon,
  TargetIcon,
  RepeatIcon,
  TrendingUpIcon,
} from "@/components/ui/icons";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const features = [
    {
      icon: SparklesIcon,
      title: "Insights that adapt",
      body: "Auto-generated spending patterns, streaks, and projections.",
    },
    {
      icon: TargetIcon,
      title: "Goals with progress",
      body: "Visual savings targets with deadlines and contributions.",
    },
    {
      icon: RepeatIcon,
      title: "Automate the boring",
      body: "Recurring income and expenses posted for you on schedule.",
    },
  ];

  return (
    <div className="relative min-h-screen grid md:grid-cols-2">
      {/* Left hero */}
      <div className="relative hidden md:flex flex-col justify-between overflow-hidden p-12 gradient-primary text-white">
        <div className="anim-fade-up">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center">
              <SparklesIcon className="h-6 w-6" />
            </div>
            <div className="text-2xl font-extrabold tracking-tight">Finnova</div>
          </div>

          <h1 className="mt-16 text-5xl font-black leading-tight">
            Money,
            <br />
            clarified.
          </h1>
          <p className="mt-6 max-w-md text-white/85 leading-relaxed">
            Track every rupee, hit your goals, and let Finnova turn your
            transactions into insight you can actually act on.
          </p>

          <div className="mt-12 space-y-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="flex gap-4 anim-fade-up"
                  style={{ animationDelay: `${120 + i * 80}ms` }}
                >
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-white/15 backdrop-blur grid place-items-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{f.title}</div>
                    <div className="text-sm text-white/75">{f.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating stat cards decoration */}
        <div className="absolute right-[-60px] bottom-24 hidden lg:flex flex-col gap-4 rotate-[-4deg]">
          <div
            className="glass-strong rounded-2xl px-5 py-4 w-60 anim-fade-up text-foreground"
            style={{ animationDelay: "320ms" }}
          >
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              This month
            </div>
            <div className="mt-1 text-2xl font-extrabold">₹1,24,500</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-success">
              <TrendingUpIcon className="h-3 w-3" /> +12.4%
            </div>
          </div>
          <div
            className="glass-strong rounded-2xl px-5 py-4 w-60 anim-fade-up text-foreground ml-6"
            style={{ animationDelay: "420ms" }}
          >
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Savings goal
            </div>
            <div className="mt-1 text-2xl font-extrabold">68%</div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full gradient-primary"
                style={{ width: "68%" }}
              />
            </div>
          </div>
        </div>

        <div className="relative text-sm text-white/70">
          © {new Date().getFullYear()} Finnova
        </div>
      </div>

      {/* Right form area */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
