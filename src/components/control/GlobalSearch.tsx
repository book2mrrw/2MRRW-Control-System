"use client";

import Link from "next/link";
import { useEffect, useState, type KeyboardEvent } from "react";

type SearchResult = {
  id: string;
  type: string;
  title: string;
  detail: string;
  href: string;
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
      const payload = await response.json().catch(() => null);
      setResults(payload?.data ?? []);
      setOpen(true);
      setActiveIndex(0);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [query]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
    if (event.key === "Enter" && results[activeIndex]) {
      window.location.href = results[activeIndex].href;
    }
  }

  return (
    <div className="global-search">
      <label>
        <span className="sr-only">Search Control System</span>
        <input
          aria-label="Search releases, tracks, contributors, and drafts"
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search releases, tracks, credits..."
          value={query}
        />
      </label>
      {open ? (
        <div className="global-search-menu">
          {results.map((result, index) => (
            <Link className="global-search-result" data-active={index === activeIndex ? "true" : "false"} href={result.href} key={`${result.type}-${result.id}`}>
              <strong>{result.title}</strong>
              <span>{result.type} / {result.detail}</span>
            </Link>
          ))}
          {!results.length ? <span className="global-search-empty">No releases or collaborators found. Create a new release or contributor.</span> : null}
        </div>
      ) : null}
    </div>
  );
}
