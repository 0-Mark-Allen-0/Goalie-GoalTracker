// frontend/src/Home.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Receipt, Wallet } from "lucide-react";

import { getCurrentUser, loginUrl } from "@/api";

const POINTS = [
  {
    icon: Wallet,
    title: "Every earning keeps its own balance",
    body: "The ₹10,000 you made building a project for Mr. John in August stays that money — with its date, its name, and a running total of what is left.",
  },
  {
    icon: Receipt,
    title: "Expenses point back at the work that paid for them",
    body: "\"₹6,000 for a watch, spent from Project for Mr. John.\" Your history remembers which money you used, not just how much.",
  },
  {
    icon: Lock,
    title: "Goals reserve, they do not deduct",
    body: "Set money aside for an iPhone from three different earnings. It stays where it is — it just stops being spendable.",
  },
];

export default function Home() {
  const navigate = useNavigate();

  // A live session skips the landing page entirely.
  useEffect(() => {
    getCurrentUser()
      .then(() => navigate("/dashboard"))
      .catch(() => undefined);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="container mx-auto px-6 py-6 flex items-center gap-2.5">
        <span className="bg-brand p-2 rounded-xl text-brand-ink shadow-sm">
          <Wallet className="w-5 h-5" />
        </span>
        <span className="font-serif text-2xl text-ink-1">Goalie</span>
      </header>

      <main className="flex-1 container mx-auto px-6 flex flex-col justify-center py-12">
        <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-[--motion-slow]">
          <h1 className="font-serif text-5xl sm:text-6xl leading-[1.05] text-ink-1 mb-5">
            Know which money you are actually spending.
          </h1>
          <p className="text-lg text-ink-2 font-medium max-w-2xl mb-8">
            Your bank shows one number. Goalie keeps every rupee attached to the work that
            earned it, so a profit-and-loss sheet you can actually read builds itself.
          </p>
          <a href={loginUrl()} className="btn-primary h-13 px-8 text-base inline-flex w-fit">
            Continue with Google <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-16">
          {POINTS.map((point, index) => (
            <div
              key={point.title}
              className="glass-card glass-card-strong glass-card-hover p-6 animate-in fade-in slide-in-from-bottom-4 duration-[--motion-slow] fill-mode-both"
              style={{ animationDelay: `calc(var(--motion-stagger) * ${index + 2})` }}
            >
              <point.icon className="w-6 h-6 text-brand mb-3" />
              <h2 className="font-serif text-xl text-ink-1 mb-2">{point.title}</h2>
              <p className="text-sm text-ink-2 font-medium leading-relaxed">{point.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
