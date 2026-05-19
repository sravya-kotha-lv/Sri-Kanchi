type FilterDropdownProps = {
  label: string;
  value: string;
  options: string[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
};

function FilterDropdown({ label, value, options, isOpen, onToggle, onSelect }: FilterDropdownProps) {
  return (
    <div className="relative">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/48">{label}</p>
      <div className="mt-4">
        <button
          type="button"
          onClick={onToggle}
          className={`flex w-full items-center justify-between rounded-[1.4rem] border px-5 py-4 text-left transition ${
            isOpen
              ? 'border-[#d7a191] bg-[linear-gradient(145deg,rgba(255,249,245,0.98),rgba(245,229,220,0.92))] shadow-[0_18px_36px_rgba(122,72,60,0.14)]'
              : 'border-white/85 bg-[linear-gradient(145deg,rgba(255,255,255,0.8),rgba(244,234,226,0.7))] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_10px_20px_rgba(122,72,60,0.06)]'
          }`}
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-ink/36">Selected</p>
            <p className="mt-1 text-base font-semibold text-[#4a2a2c]">{value}</p>
          </div>
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(247,228,214,0.92))] text-wine shadow-[0_10px_18px_rgba(122,72,60,0.12)] transition ${
              isOpen ? 'rotate-180' : ''
            }`}
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M5.2 7.4a1 1 0 0 1 1.4 0L10 10.8l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.8a1 1 0 0 1 0-1.4Z" />
            </svg>
          </span>
        </button>

        {isOpen ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.8rem)] z-20 rounded-[1.6rem] border border-white/90 bg-[linear-gradient(145deg,rgba(255,250,246,0.98),rgba(243,228,216,0.96))] p-3 shadow-[0_28px_48px_rgba(90,50,45,0.2),inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-xl">
            <div className="max-h-64 overflow-y-auto pr-1">
              {options.map((option) => {
                const isSelected = option === value;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onSelect(option)}
                    className={`flex w-full items-center justify-between rounded-[1.1rem] px-4 py-3 text-left text-sm font-semibold transition ${
                      isSelected
                        ? 'bg-[linear-gradient(135deg,#8c3f56_0%,#c86d60_100%)] text-white shadow-[0_14px_26px_rgba(106,45,59,0.22)]'
                        : 'text-ink/76 hover:bg-white/65 hover:text-wine'
                    }`}
                  >
                    <span>{option}</span>
                    {isSelected ? <span className="text-xs uppercase tracking-[0.18em] text-white/80">Chosen</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default FilterDropdown;
