"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";

export type TypeaheadOption = {
  value: string;
  label?: string;
  detail?: string;
  usageCount?: number;
  lastUsedAt?: string;
};

export function TypeaheadField({
  name,
  label,
  defaultValue = "",
  placeholder,
  options,
  emptyLabel = "No collaborators found. Create a new contributor.",
  createLabel = "+ Create New Contributor",
  required = false,
  readOnly = false
}: {
  name?: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  options: TypeaheadOption[];
  emptyLabel?: string;
  createLabel?: string;
  required?: boolean;
  readOnly?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState(defaultValue);
  const [debouncedQuery, setDebouncedQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 200);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const rankedOptions = useMemo(
    () =>
      [...options].sort((a, b) => {
        const usage = (b.usageCount ?? 0) - (a.usageCount ?? 0);
        if (usage !== 0) return usage;
        return (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? "") || a.value.localeCompare(b.value);
      }),
    [options]
  );

  const matches = useMemo(() => {
    const normalized = debouncedQuery.trim().toLowerCase();
    if (!normalized) return rankedOptions.slice(0, 6);
    return rankedOptions
      .filter((option) => `${option.value} ${option.label ?? ""} ${option.detail ?? ""}`.toLowerCase().includes(normalized))
      .slice(0, 6);
  }, [debouncedQuery, rankedOptions]);

  function select(nextValue: string) {
    setValue(nextValue);
    setQuery(nextValue);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      setOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, matches.length));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter" || event.key === "Tab") {
      const activeMatch = matches[activeIndex];
      if (open && activeMatch) {
        event.preventDefault();
        select(activeMatch.value);
      } else if (open && query.trim()) {
        select(query.trim());
      }
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <label className="typeahead-field">
      {label}
      <input name={name} type="hidden" value={value} />
      <input
        aria-autocomplete="list"
        aria-expanded={open}
        autoComplete="off"
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.target.value);
          setValue(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        value={query}
      />
      {open && !readOnly ? (
        <span className="typeahead-menu" role="listbox">
          {matches.map((option, index) => (
            <button
              className="typeahead-option"
              data-active={index === activeIndex ? "true" : "false"}
              key={`${option.value}-${option.detail ?? ""}`}
              onMouseDown={(event) => {
                event.preventDefault();
                select(option.value);
              }}
              type="button"
            >
              <strong>{option.label ?? option.value}</strong>
              <small>{option.detail ?? "Saved suggestion"}</small>
            </button>
          ))}
          {!matches.length ? <span className="typeahead-empty">{emptyLabel}</span> : null}
          {query.trim() && !matches.some((option) => option.value.toLowerCase() === query.trim().toLowerCase()) ? (
            <button
              className="typeahead-create"
              onMouseDown={(event) => {
                event.preventDefault();
                select(query.trim());
              }}
              type="button"
            >
              {createLabel}
            </button>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}
