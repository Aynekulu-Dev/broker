'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Reveal } from '@/components/Reveal';
import { InteractiveDemo } from '@/components/InteractiveDemo';

const FEATURES = [
  {
    title: 'ያለ የይለፍ ቃል መግቢያ',
    body: 'ነጋዴዎች admin ከሰጣቸው ኮድ ጋር ብቻ ይገባሉ — የተጠቃሚ ስም ወይም ውስብስብ password አያስፈልግም።',
    icon: <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    title: 'ቀላል ክምችት አስተዳደር',
    body: '"አለ" ወይም "አልቋል" ብቻ — ትክክለኛ ቁጥር መቁጠር አያስፈልግም፣ በአንድ ጠቅታ ይቀየራል።',
    icon: <path d="M5 8h14M5 12h14M5 16h9" />,
  },
  {
    title: 'ቀጥታ የቴሌግራም ማንቂያ',
    body: 'ትዕዛዝ ወይም ደረሰኝ ሲላክ admin ወዲያውኑ በቴሌግራም ኖቲፊኬሽን ያገኛል — refresh ማድረግ አያስፈልግም።',
    icon: <path d="M12 3v18m0-18l-7 4m7-4l7 4M5 7v10l7 4 7-4V7" />,
  },
  {
    title: 'ትክክለኛ ደብተር',
    body: 'የእያንዳንዱ ነጋዴ ዕዳ፣ ክፍያ እና ቀሪ ሂሳብ በራስ-ሰር ይሰላል — የማይሳሳት ዲጂታል ደብተር።',
    icon: (
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V4a2 2 0 00-2-2H6.5A2.5 2.5 0 004 4.5v15z" />
    ),
  },
];

function FeatureIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6"
    >
      {children}
    </svg>
  );
}

function LandingPage() {
  return (
    <div className="min-h-dvh bg-paper overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-ink-navy text-cream">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <span className="font-extrabold text-lg tracking-tight">ትዕዛዝ ደብተር</span>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm font-bold px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              የነጋዴ መግቢያ
            </Link>
            <Link
              href="/admin/login"
              className="text-sm font-bold px-4 py-2 rounded-lg border border-cream/30 hover:bg-white/10 transition-colors"
            >
              የአስተዳዳሪ መግቢያ
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-navy text-cream">
        <div className="max-w-5xl mx-auto px-5 pt-16 pb-24 md:pt-24 md:pb-32 relative">
          <div className="max-w-xl">
            <span className="inline-block text-xs font-bold tracking-wide uppercase text-ochre bg-ochre/10 border border-ochre/30 rounded-full px-3 py-1 mb-5 animate-fade-up">
              ለጅምላ ነጋዴዎች የተሰራ
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.15] mb-5 animate-fade-up [animation-delay:80ms]">
              የት ቢሆኑ እናደርሳለን።
              <br />
              <span className="text-ochre">ትዕዛዝዎን ይከታተሉ</span>፣ ከመነሻ እስከ መድረሻ።
            </h1>
            <p className="text-cream/75 text-lg leading-relaxed mb-8 animate-fade-up [animation-delay:160ms]">
              ትዕዛዝ፣ ክምችት፣ ትራንስፖርት እና ሂሳብ በአንድ ቦታ — ያለ Telegram ቡድን ግርግር፣ ያለ የጠፋ ወረቀት።
              ነጋዴዎችዎ በስልካቸው ብቻ ትዕዛዝ ያደርጋሉ፣ እርስዎ ደግሞ ሁሉንም ነገር ከ dashboard ይቆጣጠራሉ።
            </p>
            <div className="flex flex-wrap gap-3 animate-fade-up [animation-delay:240ms]">
              <Link href="/login" className="btn btn-primary">
                እንደ ነጋዴ ግባ →
              </Link>
              <Link href="/admin/login" className="btn btn-outline !border-cream/40 !text-cream">
                የአስተዳዳሪ ዳሽቦርድ
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative stamp — floats gently, echoes the in-stock badge used throughout the app */}
        <div
          className="hidden md:flex absolute right-10 top-1/2 -translate-y-1/2 items-center justify-center w-40 h-40 rounded-full border-4 border-ochre/40 text-ochre/70 font-extrabold text-2xl tracking-wide animate-float animate-pulse-ring"
          aria-hidden
        >
          <span className="border-2 border-current rounded-lg px-4 py-2">አለ</span>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 py-16 md:py-20">
        <Reveal className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-extrabold text-ink mb-2">ስርዓቱ ምን ይፈታል</h2>
          <p className="text-ink-soft max-w-lg mx-auto">
            ከ 40+ በላይ ነጋዴዎች ጋር በቀጥታ ምክክር የተሰራ — እውነተኛ ችግር ላይ ያተኮረ።
          </p>
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 90}>
              <div className="paper-card p-6 flex gap-4 h-full transition-transform hover:-translate-y-1">
                <div className="shrink-0 w-11 h-11 rounded-xl bg-ochre/10 text-ochre-deep flex items-center justify-center">
                  <FeatureIcon>{f.icon}</FeatureIcon>
                </div>
                <div>
                  <div className="font-bold text-ink mb-1">{f.title}</div>
                  <p className="text-sm text-ink-soft leading-relaxed">{f.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Interactive "how it works" demo */}
      <section className="bg-ink-navy-deep text-cream">
        <div className="max-w-5xl mx-auto px-5 py-16 md:py-20">
          <Reveal className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-2">እንዴት ይሰራል</h2>
            <p className="text-cream/60 max-w-md mx-auto">ደረጃውን ይንኩ እና ስክሪኑ ላይ በቀጥታ ይመልከቱ</p>
          </Reveal>
          <Reveal delay={100}>
            <InteractiveDemo />
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-5 py-16 md:py-20 text-center">
        <Reveal>
          <h2 className="text-2xl md:text-3xl font-extrabold text-ink mb-4">ዛሬውኑ ይጀምሩ</h2>
          <p className="text-ink-soft mb-8 max-w-md mx-auto">
            ኮድ ካገኙ ወደ ካታሎግ ይግቡ። Admin ከሆኑ dashboard ውስጥ ገብተው ነጋዴ ይመዝግቡ።
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/login" className="btn btn-primary">
              እንደ ነጋዴ ግባ
            </Link>
            <Link href="/admin/login" className="btn btn-navy">
              እንደ አስተዳዳሪ ግባ
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-paper-line py-8 text-center text-sm text-ink-soft">
        ትዕዛዝ ደብተር — የጅምላ ንግድ ትዕዛዝ ስርዓት
      </footer>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setShowLanding(true);
      return;
    }
    if (user.role === 'ADMIN') router.replace('/admin/orders');
    else router.replace('/catalog');
  }, [ready, user, router]);

  if (!ready || (user && !showLanding)) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-ink-navy text-cream font-bold">
        በመጫን ላይ...
      </div>
    );
  }

  return <LandingPage />;
}
