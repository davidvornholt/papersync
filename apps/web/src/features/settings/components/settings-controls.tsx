'use client';

const wideToggleCount = 3;
export type ToggleOption = {
  readonly value: string;
  readonly label: string;
  readonly description: string;
  readonly icon: React.ReactNode;
};

type ToggleButtonsProps = {
  readonly options: ReadonlyArray<ToggleOption>;
  readonly value: string;
  readonly onChange: (value: string) => void;
};

const gridColsClass = (count: number): string => {
  if (count >= wideToggleCount) {
    return 'grid-cols-1 sm:grid-cols-3';
  }
  if (count === 2) {
    return 'grid-cols-1 sm:grid-cols-2';
  }
  return 'grid-cols-1';
};

export const ToggleButtons = ({
  options,
  value,
  onChange,
}: ToggleButtonsProps): React.ReactElement => (
  <div
    className={`grid ${gridColsClass(options.length)} gap-px border border-hairline bg-hairline`}
  >
    {options.map((option) => {
      const isActive = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={isActive}
          onClick={() => onChange(option.value)}
          className={`relative cursor-pointer touch-manipulation p-4 text-left transition-colors duration-200 sm:p-5 ${
            isActive
              ? 'bg-paper-deep'
              : 'bg-paper hover:bg-paper-deep/60 focus-visible:bg-paper-deep/60'
          }`}
        >
          {isActive ? (
            <span
              aria-hidden={true}
              className="absolute inset-y-0 left-0 w-[2px] bg-accent"
            />
          ) : null}
          <div className="flex items-start gap-3">
            <span
              aria-hidden={true}
              className={`inline-flex size-8 shrink-0 items-center justify-center transition-colors ${
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
