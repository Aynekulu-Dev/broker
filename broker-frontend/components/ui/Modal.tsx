'use client';

export function Modal({
  onClose,
  children,
  variant = 'sheet',
  maxWidth = 520,
}: {
  onClose: () => void;
  children: React.ReactNode;
  /** 'sheet' slides up from the bottom (good for long forms); 'center' floats mid-screen (good for short confirmations) */
  variant?: 'sheet' | 'center';
  maxWidth?: number;
}) {
  const isSheet = variant === 'sheet';

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 bg-ink-navy-deep/55 flex justify-center z-50 ${
        isSheet ? 'items-end p-0' : 'items-center p-5'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`paper-card w-full mx-auto ${
          isSheet ? 'max-h-[88vh] overflow-y-auto p-4 rounded-b-none' : 'p-5'
        }`}
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  );
}
