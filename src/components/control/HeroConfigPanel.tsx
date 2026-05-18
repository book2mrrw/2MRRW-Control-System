"use client";

import { useEffect, useState, type FormEvent } from "react";

export function HeroConfigPanel() {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [backgroundMediaUrl, setBackgroundMediaUrl] = useState("");
  const [backgroundMediaType, setBackgroundMediaType] = useState<"image" | "mp4">("image");
  const [status, setStatus] = useState("Hero config saves only when a Supabase hero_config table is available.");

  useEffect(() => {
    fetch("/api/admin/hero-config", { headers: { "x-admin": "true" }, cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        const data = payload?.data?.data;
        if (data) {
          setTitle(data.title ?? "");
          setSubtitle(data.subtitle ?? "");
          setCtaLabel(data.cta_label ?? "");
          setCtaHref(data.cta_href ?? "");
          setBackgroundMediaUrl(data.background_media_url ?? "");
          setBackgroundMediaType(data.background_media_type === "mp4" ? "mp4" : "image");
        }
        setStatus(payload?.data?.message ?? "Hero config ready.");
      })
      .catch(() => setStatus("Hero config persistence is not available yet."));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving hero config...");
    const response = await fetch("/api/admin/hero-config", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin": "true" },
      body: JSON.stringify({ title, subtitle, ctaLabel, ctaHref, backgroundMediaUrl, backgroundMediaType })
    });
    const payload = await response.json().catch(() => null);
    setStatus(response.ok ? "Hero config saved to Supabase." : payload?.error?.message ?? "Hero config could not be saved.");
  }

  return (
    <section className="panel hero-config-panel">
      <div className="section-heading">
        <div>
          <p className="meta-label">Hero config</p>
          <h2>Homepage hero control</h2>
        </div>
        <span className="state-badge">Image / MP4 loop</span>
      </div>
      <form className="control-form" onSubmit={submit}>
        <label>
          Hero title
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="2MRRW release moment" required />
        </label>
        <label>
          Hero subtitle
          <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="Optional supporting line" />
        </label>
        <label>
          CTA label
          <input value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} placeholder="Optional action label" />
        </label>
        <label>
          CTA href
          <input value={ctaHref} onChange={(event) => setCtaHref(event.target.value)} placeholder="/releases or backend preview URL" />
        </label>
        <label>
          Background media URL
          <input value={backgroundMediaUrl} onChange={(event) => setBackgroundMediaUrl(event.target.value)} placeholder="Stored image or MP4 URL" />
        </label>
        <label>
          Background media type
          <select value={backgroundMediaType} onChange={(event) => setBackgroundMediaType(event.target.value === "mp4" ? "mp4" : "image")}>
            <option value="image">Image</option>
            <option value="mp4">MP4 loop</option>
          </select>
        </label>
        <button className="control-button" type="submit">Save Hero Config</button>
      </form>
      {backgroundMediaUrl ? (
        <div className="hero-config-preview">
          {backgroundMediaType === "mp4" ? (
            <video autoPlay loop muted playsInline src={backgroundMediaUrl} />
          ) : (
            <img alt="" src={backgroundMediaUrl} />
          )}
        </div>
      ) : null}
      <p className="form-status">{status}</p>
    </section>
  );
}
