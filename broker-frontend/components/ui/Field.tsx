'use client';

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FieldWrapProps {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}

export function FieldWrap({ label, htmlFor, children }: FieldWrapProps) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

export function Field({
  label,
  id,
  ...rest
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldWrap label={label} htmlFor={id}>
      <input id={id} {...rest} />
    </FieldWrap>
  );
}

export function SelectField({
  label,
  id,
  children,
  ...rest
}: { label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldWrap label={label} htmlFor={id}>
      <select id={id} {...rest}>
        {children}
      </select>
    </FieldWrap>
  );
}

export function TextareaField({
  label,
  id,
  ...rest
}: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldWrap label={label} htmlFor={id}>
      <textarea id={id} {...rest} />
    </FieldWrap>
  );
}
