import { Target, TrendingUp, ShieldCheck, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "./api/goals";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const verifyUser = async () => {
      try {
        await getCurrentUser();
        navigate("/dashboard");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // Not logged in, stay on home page
      }
    };
    verifyUser();
  }, [navigate]);

  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/auth/google/login`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#B3C8CF]/30 blur-3xl mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#89A8B2]/20 blur-3xl mix-blend-multiply" />

      <div className="w-full max-w-5xl z-10 flex flex-col items-center">
        {/* Main Hero Card */}
        <div className="glass-card p-12 md:p-20 text-center w-full max-w-3xl mx-auto flex flex-col items-center border-t-white border-l-white">
          <div className="bg-white/60 p-4 rounded-[24px] mb-8 shadow-sm inline-block">
            <Target className="w-12 h-12 text-[#89A8B2]" />
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-[#2c3e50] tracking-tight mb-6">
            Track your goals. <br />
            <span className="text-[#89A8B2]">Beautifully.</span>
          </h1>

          <p className="text-xl text-[#546e7a] mb-12 max-w-xl font-medium leading-relaxed">
            A serene, mathematically secure ledger for your personal financial
            milestones. Stop guessing, start visualizing.
          </p>

          <button
            onClick={handleLogin}
            className="btn-primary text-lg px-8 py-4 w-full md:w-auto"
          >
            Continue with Google <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full">
          <div className="glass-card p-8 flex flex-col items-center text-center">
            <div className="bg-[#B3C8CF]/30 p-4 rounded-2xl mb-4 text-[#4a636d]">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#2c3e50] mb-2">
              Laser Focused
            </h3>
            <p className="text-[#546e7a] text-sm font-medium">
              No bloat. Just you, your targets, and a beautiful ledger.
            </p>
          </div>
          <div className="glass-card p-8 flex flex-col items-center text-center">
            <div className="bg-[#B3C8CF]/30 p-4 rounded-2xl mb-4 text-[#4a636d]">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#2c3e50] mb-2">
              Visual Progress
            </h3>
            <p className="text-[#546e7a] text-sm font-medium">
              Watch your savings grow with smooth, reactive progress tracking.
            </p>
          </div>
          <div className="glass-card p-8 flex flex-col items-center text-center">
            <div className="bg-[#B3C8CF]/30 p-4 rounded-2xl mb-4 text-[#4a636d]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#2c3e50] mb-2">
              Secure Math
            </h3>
            <p className="text-[#546e7a] text-sm font-medium">
              Asynchronous backend enforcement prevents negative balances.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
