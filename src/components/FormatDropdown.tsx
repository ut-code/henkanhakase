import { useState } from "react";

type DropdownProps<T extends string> = {
  value: T;
  options: readonly T[];
  disabled?: boolean;
  onChange: (value: T) => void;
};

export function FormatDropdown<T extends string>({
  value,
  options,
  disabled = false,
  onChange,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape") setIsOpen(false);
      }}
    >
      <button
        type="button"
        id="format"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex
          w-31.5
          cursor-pointer
          items-center
          justify-between
          rounded-[9px]
          border border-[#dfe5ef]
          bg-white
          px-3.75
          py-2.5
          text-[13px]
          font-semibold
          text-[#40506a]
          outline-[#6578f7]
          disabled:cursor-not-allowed
          disabled:bg-[#f5f7fa]
          disabled:text-[#9aa6b7]
        "
      >
        <span>{value}</span>
        <svg
          className={`h-3.5 w-3.5 text-[#8491a3] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div
            role="listbox"
            className="
              absolute
              top-[calc(100%+4px)]
              left-0
              z-20
              max-h-52
              w-full
              overflow-y-auto
              rounded-[9px]
              border border-[#dfe5ef]
              bg-white
              py-1
              shadow-[0_4px_12px_rgba(0,0,0,0.08)]
            "
          >
            {options.map((item) => (
              <button
                key={item}
                type="button"
                role="option"
                aria-selected={item === value}
                onClick={() => {
                  onChange(item);
                  setIsOpen(false);
                }}
                className={`
                  flex
                  w-full
                  cursor-pointer
                  items-center
                  px-3.75
                  py-1.75
                  text-left
                  text-[13px]
                  font-semibold
                  transition-colors
                  hover:bg-[#f0f4ff]
                  hover:text-[#596ff1]
                  ${
                    item === value
                      ? "bg-[#f0f4ff] text-[#596ff1]"
                      : "text-[#40506a]"
                  }
                `}
              >
                {item}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
