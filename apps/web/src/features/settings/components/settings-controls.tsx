'use client';

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
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-hairline border border-hairline">
    {options.map((option) => {
      const isActive = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={isActive}
          onClick={() => onChange(option.value)}
          className={`relative text-left p-4 sm:p-5 transition-colors duration-200 cursor-pointer touch-manipulation ${
            isActive
              ? 'bg-paper-deep'
              : 'bg-paper hover:bg-paper-deep/60 focus-visible:bg-paper-deep/60'
          }`}
        >
          {isActive && (
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-[2px] bg-accent"
            />
          )}
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className={`shrink-0 inline-flex items-center justify-center w-8 h-8 transition-colors ${
                isActive ? 'text-accent' : 'text-graphite'
              }`}
            >
              {option.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`serif text-[16px] leading-tight tracking-[-0.018em] ${
                  isActive ? 'text-ink' : 'text-ink'
                }`}
              >
                {option.label}
              </p>
              <p className="mt-1 text-[13px] text-graphite leading-snug">
                {option.description}
              </p>
            </div>
          </div>
        </button>
      );
    })}
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
    <label htmlFor={id} className="field-label">
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="field-input placeholder:text-mute"
      placeholder={placeholder}
    />
  </div>
);
