'use client';

import { motion } from 'motion/react';

export type ToggleOption = {
  readonly value: string;
  readonly label: string;
  readonly description: string;
  readonly icon: React.ReactNode;
};

type ToggleButtonsProps = {
  readonly options: readonly ToggleOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
};

export const ToggleButtons = ({
  options,
  value,
  onChange,
}: ToggleButtonsProps): React.ReactElement => (
  <div className="flex flex-col sm:flex-row gap-3">
    {options.map((option) => (
      <motion.button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`flex-1 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 text-left touch-manipulation ${
          value === option.value
            ? 'border-accent bg-accent/5'
            : 'border-border hover:border-muted'
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              value === option.value
                ? 'bg-accent text-white'
                : 'bg-background text-muted'
            }`}
          >
            {option.icon}
          </div>
          <p className="font-medium text-foreground">{option.label}</p>
        </div>
        <p className="text-sm text-muted">{option.description}</p>
      </motion.button>
    ))}
  </div>
);

type InputFieldProps = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: string;
  readonly placeholder?: string;
};

export const InputField = ({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: InputFieldProps): React.ReactElement => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-medium text-foreground mb-2"
    >
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
      placeholder={placeholder}
    />
  </div>
);
