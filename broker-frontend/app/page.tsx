'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Reveal } from '@/components/Reveal';
import { InteractiveDemo } from '@/components/InteractiveDemo';

// የባለቤቱ መረጃ እና ስልክ ቁጥር (በገጹ ላይ ለዕርዳታ የሚታይ)
const OWNER_NAME = 'ይበልጣል ካሳሁን';
const OWNER_PHONE_DISPLAY = '+251 91 167 6738';
const OWNER_PHONE_TEL = '+251911676738';

const FEATURES = [
  {
    title: 'ቀላል በስልክ ቁጥር መግቢያ',
    body: 'ነጋዴዎች በተሰጣቸው ስልክ ቁጥር ብቻ በቀላሉ ይገባሉ — የተጠቃሚ ስም ወይም የይለፍ ቃል ማስታወስ አያስፈልግም።',
    icon: <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    title: 'ቀለል ያለ የክምችት ቁጥጥር',
    body: '"አለ" ወይም "አልቋል" ብቻ — ትክክለኛ ቁጥር መቁጠር አያስፈልግም፣ በአንድ ጠቅታ ይቀየራል።',
    icon: <path d="M5 8h14M5 12h14M5 16h9" />,
  },
  {
    title: 'ፈጣን የትዕዛዝ ማሳወቂያ',
    body: 'ትዕዛዝ ወይም ደረሰኝ ሲላክ ወዲያውኑ ማሳወቂያ ይደርሳል — ገጽ ማደስ (refresh) ማድረግ አያስፈልግም።',
    icon: <path d="M12 3v18m0-18l-7 4m7-4l7 4M5 7v10l7 4 7-4V7" />,
  },
  {
    title: 'ትክክለኛ ዲጂታል ደብተር',
    body: 'የእያንዳንዱ ነጋዴ ዕዳ፣ ክፍያ እና ቀሪ ሂሳብ በራስ-ሰር ይሰላል — የማይሳሳት አሰራር።',
    icon: (
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V4a2 2 0 00-2-2H6.5A2.5 2.5 0 004 4.5v15z" />
    ),
  },
];

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function OwnerBadge() {
  return (
    <a
      href={`tel:${OWNER_PHONE_TEL}`}
      className="inline-flex items-center gap-3 bg-white/5 border border-cream/15 rounded-2xl px-4 py-2.5 mt-6 animate-fade-up [animation-delay:320ms] hover:bg-white/10 transition-colors"
    >
      <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-ochre/15 text-ochre shrink-0">
        <span className="absolute inset-0 rounded-full animate-pulse-ring" />
        <PhoneIcon />
      </span>
      <span className="text-left">
        <span className="block text-[11px] text-cream/55 font-semibold">የንግዱ ባለቤት</span>
        <span className="block text-sm font-bold text-cream">
          {OWNER_NAME} · <span className="text-ochre">{OWNER_PHONE_DISPLAY}</span>
        </span>
      </span>
    </a>
  );
}

function FloatingCallButton() {
  return (
    <a
      href={`tel:${OWNER_PHONE_TEL}`}
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 bg-ochre text-white rounded-full pl-4 pr-5 py-3.5 shadow-[0_6px_20px_rgba(192,138,40,0.45)] hover:bg-ochre-deep transition-colors"
      aria-label={`ደውል ${OWNER_PHONE_DISPLAY}`}
    >
      <span className="relative flex items-center justify-center w-5 h-5">
        <span className="absolute inset-0 rounded-full animate-pulse-ring" />
        <PhoneIcon />
      </span>
      <span className="font-bold text-sm whitespace-nowrap">ይደውሉ</span>
    </a>
  );
}

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
      {/* መርከቢያ (Nav) */}
      <header className="sticky top-0 z-30 bg-ink-navy text-cream">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <span className="font-extrabold text-lg tracking-tight">ትዕዛዝ ደብተር</span>
          <div className="flex items-center gap-2">
            <Link
              href="/catalog"
              className="text-sm font-bold px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              ካታሎግ ይመልከቱ
            </Link>
            <Link href="/login" className="btn btn-primary !py-2 !px-4 !text-sm">
              የነጋዴ መግቢያ
            </Link>
          </div>
        </div>
      </header>

      {/* ዋናው መግቢያ (Hero) */}
      <section className="relative overflow-hidden bg-ink-navy text-cream">
        <div className="max-w-5xl mx-auto px-5 pt-16 pb-24 md:pt-24 md:pb-32 relative">
          <div className="max-w-xl">
            <span className="inline-block text-xs font-bold tracking-wide uppercase text-ochre bg-ochre/10 border border-ochre/30 rounded-full px-3 py-1 mb-5 animate-fade-up">
              ለጅምላ ነጋዴዎች የተዘጋጀ
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.15] mb-5 animate-fade-up [animation-delay:80ms]">
              የት ቢሆኑ እናደርሳለን።
              <br />
              <span className="text-ochre">ትዕዛዝዎን ይከታተሉ</span>፣ ከመነሻ እስከ መድረሻ።
            </h1>
            <p className="text-cream/75 text-lg leading-relaxed mb-8 animate-fade-up [animation-delay:160ms]">
              ትዕዛዝ፣ ክምችት፣ ትራንስፖርት እና ሂሳብ በአንድ ቦታ — ያለ ቡድን ግርግር እና ያለ ወረቀት መጥፋት። 
              ነጋዴዎች በስልካቸው ብቻ ትዕዛዝ ያደርጋሉ፣ አጠቃላይ ሂደቱንም በቀላሉ ይከታተላሉ።
            </p>
            <div className="flex flex-wrap gap-3 animate-fade-up [animation-delay:240ms]">
              <Link href="/catalog" className="btn btn-primary">
                ካታሎግ ይመልከቱ →
              </Link>
              <Link href="/login" className="btn btn-outline !border-cream/40 !text-cream">
                እንደ ነጋዴ ግባ
              </Link>
            </div>

            <OwnerBadge />
          </div>
        </div>

        <div
          className="hidden md:flex absolute right-10 top-1/2 -translate-y-1/2 items-center justify-center w-40 h-40 rounded-full border-4 border-ochre/40 text-ochre/70 font-extrabold text-2xl tracking-wide animate-float animate-pulse-ring"
          aria-hidden
        >
          <span className="border-2 border-current rounded-lg px-4 py-2">አለ</span>
        </div>
      </section>

      {/* ባህሪያት (Features) */}
      <section className="max-w-5xl mx-auto px-5 py-16 md:py-20">
        <Reveal className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-extrabold text-ink mb-2">ስርዓቱ ምን ይፈታል</h2>
          <p className="text-ink-soft max-w-lg mx-auto">
            ከበርካታ ነጋዴዎች ጋር በቀጥታ በመወያየት የተሰራ — እውነተኛ የንግድ ችግሮችን የሚፈታ።
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

      {/* የዴሞ ክፍፍል (Interactive Demo) */}
      <section className="bg-ink-navy-deep text-cream">
        <div className="max-w-5xl mx-auto px-5 py-16 md:py-20">
          <Reveal className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-2">እንዴት ይሰራል</h2>
            <p className="text-cream/60 max-w-md mx-auto">ደረጃውን በመንካት አሰራሩን በምስል ይመልከቱ</p>
          </Reveal>
          <Reveal delay={100}>
            <InteractiveDemo />
          </Reveal>
        </div>
      </section>

      {/* ማጠቃለያ ጥሪ (CTA) */}
      <section className="max-w-5xl mx-auto px-5 py-16 md:py-20 text-center">
        <Reveal>
          <h2 className="text-2xl md:text-3xl font-extrabold text-ink mb-4">ዛሬውኑ ይጀምሩ</h2>
          <p className="text-ink-soft mb-8 max-w-md mx-auto">
            ካታሎግ ላይ ዋጋዎችን እና የምርት ዝርዝሮችን ያለ ምዝገባ ማየት ይችላሉ። ትዕዛዝ ለመላክ የተሰጠዎትን ስልክ ቁጥር ይጠቀሙ።
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/catalog" className="btn btn-primary">
              ካታሎግ ይመልከቱ
            </Link>
            <Link href="/login" className="btn btn-navy">
              እንደ ነጋዴ ግባ
            </Link>
          </div>
        </Reveal>
      </section>

      {/* መግለጫ እና አስተዳዳሪ መግቢያ (Footer) */}
      <footer className="border-t border-paper-line py-8 text-center text-sm text-ink-soft">
        <div>ትዕዛዝ ደብተር — የጅምላ ንግድ ትዕዛዝ ስርዓት</div>
        <Link href="/admin/login" className="text-ink-soft/50 text-xs mt-2 inline-block hover:text-ink-soft">
          የአስተዳዳሪ መግቢያ
        </Link>
      </footer>

      <FloatingCallButton />
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