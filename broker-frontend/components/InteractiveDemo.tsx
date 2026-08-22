'use client';

import { useState } from 'react';

type TabKey = 'catalog' | 'order' | 'track';

const TABS: { key: TabKey; label: string; n: string }[] = [
  { key: 'catalog', label: 'ካታሎግ ይመልከቱ', n: '1' },
  { key: 'order', label: 'ትዕዛዝ ያድርጉ', n: '2' },
  { key: 'track', label: 'ትራንስፖርት ይከታተሉ', n: '3' },
];

function CatalogScreen() {
  const items = [
    { name: 'የምግብ ዘይት', price: '2,450', stock: true },
    { name: 'ስኳር (50ኪ.ግ)', price: '5,800', stock: true },
    { name: 'ዱቄት', price: '3,200', stock: false },
  ];
  return (
    <div className="p-3 space-y-2.5">
      {items.map((it, i) => (
        <div
          key={it.name}
          className="paper-card p-3 flex items-center gap-3 relative overflow-hidden animate-fade-up"
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <div
            className={`stamp ${it.stock ? 'stamp--in' : 'stamp--out'}`}
            style={{ top: 6, right: 6 }}
          >
            {it.stock ? 'አለ' : 'አልቋል'}
          </div>
          <div className="w-11 h-11 rounded-lg bg-paper-line shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-sm text-ink">{it.name}</div>
            <div className="money text-ochre-deep text-sm">{it.price} ብር</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderScreen() {
  return (
    <div className="p-4 space-y-4">
      <div className="paper-card p-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-ink-soft">የምግብ ዘይት × 4</span>
          <span className="money">9,800 ብር</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ink-soft">ስኳር × 2</span>
          <span className="money">11,600 ብር</span>
        </div>
        <div className="border-t border-paper-line pt-2 flex justify-between font-bold">
          <span>ጠቅላላ ድምር</span>
          <span className="money text-ochre-deep">21,400 ብር</span>
        </div>
      </div>
      <div className="paper-card p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-stamp-green/15 text-stamp-green flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="text-sm">
          <div className="font-bold text-ink">ደረሰኝ ተያይዟል</div>
          <div className="text-ink-soft text-xs">ትዕዛዝ ወደ አስተዳዳሪ ተልኳል</div>
        </div>
      </div>
      <button className="btn btn-primary btn-block" disabled>
        ትዕዛዝ ተልኳል ✓
      </button>
    </div>
  );
}

function TrackScreen() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">ትዕዛዝ #A214</span>
        <span className="status-pill status-pill--dispatched">ተልኳል</span>
      </div>
      <div className="paper-card p-3 border-dashed border-2 !border-ochre space-y-1.5 text-sm">
        <div className="font-bold text-ink mb-1">🚚 የትራንስፖርት መረጃ</div>
        <div className="text-ink-soft">ታርጋ ቁጥር: 3-A12345</div>
        <div className="text-ink-soft">ሹፌር: አበበ ተስፋዬ</div>
        <div className="text-ink-soft">ስልክ: 0911 22 33 44</div>
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-soft">
        <span className="w-2 h-2 rounded-full bg-stamp-green animate-pulse" />
        በመንገድ ላይ — ዛሬ ይደርሳል
      </div>
    </div>
  );
}

export function InteractiveDemo() {
  const [tab, setTab] = useState<TabKey>('catalog');

  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      {/* Step selector */}
      <div className="space-y-3 order-2 md:order-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`w-full text-left rounded-xl px-4 py-3.5 border transition-colors ${
              tab === t.key
                ? 'bg-ink-navy text-cream border-ink-navy'
                : 'bg-transparent text-cream/80 border-cream/15 hover:border-cream/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                  tab === t.key ? 'bg-ochre text-white' : 'bg-cream/10 text-cream/70'
                }`}
              >
                {t.n}
              </span>
              <span className="font-bold text-sm">{t.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Phone mockup */}
      <div className="order-1 md:order-2 flex justify-center">
        <div className="w-[280px] rounded-[2rem] border-[6px] border-ink-navy-deep bg-paper shadow-2xl overflow-hidden">
          <div className="bg-ink-navy text-cream text-xs font-bold px-4 py-2.5 flex items-center justify-between">
            <span>ትዕዛዝ ደብተር</span>
            <span className="opacity-60">9:41</span>
          </div>
          <div className="min-h-[320px]" key={tab}>
            {tab === 'catalog' && <CatalogScreen />}
            {tab === 'order' && <OrderScreen />}
            {tab === 'track' && <TrackScreen />}
          </div>
        </div>
      </div>
    </div>
  );
}
