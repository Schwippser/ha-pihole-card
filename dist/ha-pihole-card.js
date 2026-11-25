/* HA Pi-hole Card – eigenständige Pi-hole-Karte für Home Assistant (liest sensor.pi_hole_statistik). */
(() => {
  const TAG = "ha-pihole-card";
  const EDITOR = "ha-pihole-card-editor";
  const DEFAULT_ENTITY = "sensor.pi_hole_statistik";
  const EMBEDDED = { de: {"Total queries": "Anfragen gesamt", "Queries blocked": "Blockierte Anfragen", "Percent blocked": "Anteil blockiert", "Domains on lists": "Domains auf Listen", "{n} active clients": "{n} aktive Clients", "Gravity updated {d}": "Gravity aktualisiert {d}", "Total queries (last 24 hours)": "Anfragen gesamt (letzte 24 Stunden)", "Blocked": "Blockiert", "Cached": "Aus dem Cache", "Forwarded": "Weitergeleitet", "Query types": "Abfragetypen", "Upstream servers": "Upstream-Server", "Top permitted domains": "Top erlaubte Domains", "Top blocked domains": "Top blockierte Domains", "Top clients (total)": "Top Clients (gesamt)", "Top clients (blocked only)": "Top Clients (nur blockiert)", "Domain": "Domain", "Hits": "Treffer", "Frequency": "Häufigkeit", "Client": "Client", "Requests": "Anfragen", "Blocklist": "Blockliste", "Cache": "Cache", "{n} queries": "{n} Anfragen", "No data yet": "Noch keine Daten", "Entity unavailable": "Entität nicht verfügbar", "Please select an entity.": "Bitte eine Entität auswählen.", "Entity": "Entität", "Title (optional)": "Titel (optional)", "Maximum rows": "Maximale Zeilenanzahl", "Show tiles": "Kacheln anzeigen", "Show history": "Verlauf anzeigen", "Show query types": "Abfragetypen anzeigen", "Show upstream servers": "Upstream-Server anzeigen", "Show top permitted domains": "Top erlaubte Domains anzeigen", "Show top blocked domains": "Top blockierte Domains anzeigen", "Show top clients": "Top Clients anzeigen", "Show top clients (blocked only)": "Top Clients (nur blockiert) anzeigen", "Pi-hole": "Pi-hole"} };

  // ---------- Übersetzung: Englisch ist die Quellsprache, Deutsch ist eingebettet, weitere Sprachen: ./translations/<sprache>.json ----------
  const scriptUrl = (() => {
    try {
      return document.currentScript?.src || (new Error().stack || "").match(/https?:\/\/[^\s)]+?ha-pihole-card[^\s):]*\.js[^\s):]*/)?.[0] || "";
    } catch { return ""; }
  })();
  const base = scriptUrl ? scriptUrl.replace(/[?#].*$/, "").replace(/[^/]*$/, "") : "/local/ha-pihole-card/";
  const query = (scriptUrl.match(/\?[^#]*/) || [""])[0];
  const loaded = {};
  const listeners = new Set();
  const langOf = (hass) => String(hass?.locale?.language || hass?.language || "en").toLowerCase().split(/[-_]/)[0];
  const ensureLang = (code) => {
    if (code === "en" || EMBEDDED[code] || code in loaded) return;
    loaded[code] = null;
    fetch(`${base}translations/${code}.json${query}`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((dict) => { loaded[code] = dict; listeners.forEach((fn) => fn()); });
  };
  const translate = (hass, text, vars) => {
    const code = langOf(hass);
    ensureLang(code);
    let out = (EMBEDDED[code] ?? loaded[code] ?? {})[text] ?? text;
    for (const [k, v] of Object.entries(vars || {})) out = out.replaceAll(`{${k}}`, v);
    return out;
  };

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const isNum = (v) => typeof v === "number" && Number.isFinite(v);
  const arr = (v) => (Array.isArray(v) ? v : []);

  const TYPE_COLORS = ["#f0614b", "#3b8dbd", "#00c0ef", "#f39c12", "#0073b7", "#4a5a8a", "#39cccc", "#3d9970", "#9b3dbf", "#6c7480", "#d2d6de"];
  const UPSTREAM_COLORS = ["#f0614b", "#3b8dbd", "#00a65a", "#00c0ef", "#f39c12", "#9b3dbf", "#39cccc", "#6c7480"];
  const TILE = { total: "#0d7b9a", blocked: "#9a2b25", percent: "#b9770b", domains: "#0a5c2f" };
  const SECTIONS = ["show_tiles", "show_history", "show_query_types", "show_upstreams", "show_top_domains", "show_top_blocked", "show_top_clients", "show_top_clients_blocked"];

  const STYLE = `
    :host { display: block; }
    ha-card { padding: 12px; }
    .title { font-size: 1.15rem; font-weight: 500; padding: 4px 4px 10px; color: var(--primary-text-color); }
    .grid { display: grid; gap: 12px; margin-bottom: 12px; }
    .grid.tiles { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
    .grid.two { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
    .grid:last-child { margin-bottom: 0; }
    .tile { position: relative; overflow: hidden; border-radius: 8px; color: #fff; padding: 10px 12px 8px; min-height: 84px; display: flex; flex-direction: column; justify-content: space-between; }
    .tile .label { font-size: .85rem; opacity: .95; }
    .tile .value { font-size: 1.9rem; font-weight: 600; line-height: 1.15; }
    .tile .foot { font-size: .75rem; opacity: .85; text-align: right; }
    .tile ha-icon { position: absolute; right: 8px; top: 10px; --mdc-icon-size: 56px; opacity: .22; }
    .box { border: 1px solid var(--divider-color); border-radius: 8px; overflow: hidden; min-width: 0; }
    .box > h3 { margin: 0; padding: 8px 12px; font-size: 1rem; font-weight: 500; border-bottom: 1px solid var(--divider-color); color: var(--primary-text-color); }
    .box .body { padding: 10px 12px; }
    .chart { position: relative; height: 130px; }
    .chart svg { width: 100%; height: 100%; display: block; }
    .axis { position: relative; height: 16px; margin-top: 2px; font-size: .7rem; color: var(--secondary-text-color); }
    .axis span { position: absolute; transform: translateX(-50%); white-space: nowrap; }
    .key { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 6px; font-size: .75rem; color: var(--secondary-text-color); }
    .key i, .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
    .rbox { display: flex; flex-direction: column; }
    .rbox .body { flex: 1; display: flex; align-items: center; }
    .ring { width: 100%; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; justify-content: center; }
    .ring svg { width: 150px; height: 150px; flex: none; }
    .legend { display: flex; flex-direction: column; gap: 3px; font-size: .8rem; color: var(--primary-text-color); min-width: 0; }
    .legend span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .legend small { color: var(--secondary-text-color); margin-left: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: .85rem; }
    th { text-align: left; font-weight: 600; padding: 6px 10px; border-bottom: 1px solid var(--divider-color); color: var(--primary-text-color); }
    td { padding: 5px 10px; border-bottom: 1px solid var(--divider-color); color: var(--primary-text-color); }
    tr:last-child td { border-bottom: 0; }
    td.name { max-width: 0; width: 55%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    td.num { white-space: nowrap; width: 1%; }
    td.bar { width: 30%; }
    .bar span { display: block; height: 8px; border-radius: 2px; min-width: 1px; }
    .empty { padding: 16px; text-align: center; color: var(--secondary-text-color); }
  `;

  class HaPiholeCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._onLang = () => this._render();
    }
    connectedCallback() { listeners.add(this._onLang); }
    disconnectedCallback() { listeners.delete(this._onLang); }

    static getConfigElement() { return document.createElement(EDITOR); }
    static getStubConfig(hass) {
      const found = Object.entries(hass?.states ?? {}).find(([id, s]) => id.startsWith("sensor.") && s.attributes?.query_types && s.attributes?.upstreams);
      return { entity: found?.[0] ?? DEFAULT_ENTITY };
    }
    getCardSize() { return 12; }
    getGridOptions() { return { columns: 12, min_columns: 6 }; }

    setConfig(config) {
      if (!config?.entity) throw new Error("Please select an entity.");
      this._config = { rows: 10, ...config };
      this._render();
    }
    set hass(hass) {
      const before = this._hass?.states?.[this._config?.entity];
      const langBefore = this._hass ? langOf(this._hass) : null;
      this._hass = hass;
      const now = hass?.states?.[this._config?.entity];
      if (before !== now || langBefore !== langOf(hass) || !this._rendered) this._render();
    }

    _t(text, vars) { return translate(this._hass, text, vars); }
    _n(value, digits = 0) {
      if (!isNum(value)) return "—";
      try { return new Intl.NumberFormat(langOf(this._hass), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value); }
      catch { return value.toFixed(digits); }
    }

    _tiles(a, total) {
      const t = (text, vars) => this._t(text, vars);
      const date = isNum(a.gravity_last_update) ? new Date(a.gravity_last_update * 1000).toLocaleDateString(langOf(this._hass), { day: "2-digit", month: "2-digit" }) : null;
      const tile = (color, icon, label, value, foot) => `<div class="tile" style="background:${color}"><ha-icon icon="${icon}"></ha-icon>
        <span class="label">${esc(label)}</span><span class="value">${esc(value)}</span><span class="foot">${esc(foot ?? "")}&nbsp;</span></div>`;
      return `<div class="grid tiles">
        ${tile(TILE.total, "mdi:earth", t("Total queries"), this._n(total), isNum(a.clients_active) ? t("{n} active clients", { n: this._n(a.clients_active) }) : "")}
        ${tile(TILE.blocked, "mdi:hand-back-right", t("Queries blocked"), this._n(a.blocked), "")}
        ${tile(TILE.percent, "mdi:chart-pie", t("Percent blocked"), isNum(a.percent_blocked) ? this._n(a.percent_blocked, 1) + " %" : "—", "")}
        ${tile(TILE.domains, "mdi:format-list-bulleted", t("Domains on lists"), this._n(a.domains_on_lists), date ? t("Gravity updated {d}", { d: date }) : "")}
      </div>`;
    }

    _history(a) {
      const total = arr(a.hist_total);
      const n = total.length;
      if (n < 2) return "";
      const blocked = arr(a.hist_blocked), cached = arr(a.hist_cached), forwarded = arr(a.hist_forwarded);
      const max = Math.max(1, ...total);
      const h = 100;
      const start = isNum(a.hist_start) ? a.hist_start : null;
      const slot = 600;
      const clock = (i) => new Date((start + i * slot) * 1000).toLocaleTimeString(langOf(this._hass), { hour: "2-digit", minute: "2-digit" });
      let bars = "";
      for (let i = 0; i < n; i++) {
        const b = Math.max(0, blocked[i] || 0), c = Math.max(0, cached[i] || 0), f = Math.max(0, forwarded[i] || 0);
        const hb = b / max * h, hc = c / max * h, hf = f / max * h;
        const x = i * 10 + 1;
        const tip = `${start != null ? clock(i) + " – " : ""}${this._t("Total queries")}: ${this._n(total[i])}, ${this._t("Blocked")}: ${this._n(b)}`;
        bars += `<g><title>${esc(tip)}</title>
          <rect x="${x}" y="${(h - hb).toFixed(1)}" width="8" height="${hb.toFixed(1)}" fill="#f0614b"></rect>
          <rect x="${x}" y="${(h - hb - hc).toFixed(1)}" width="8" height="${hc.toFixed(1)}" fill="#3b8dbd"></rect>
          <rect x="${x}" y="${(h - hb - hc - hf).toFixed(1)}" width="8" height="${hf.toFixed(1)}" fill="#00a65a"></rect></g>`;
      }
      let labels = "";
      if (start != null) {
        let last = -1;
        for (let i = 0; i < n; i++) {
          const d = new Date((start + i * slot) * 1000);
          if (d.getMinutes() < 10 && d.getHours() % 3 === 0 && d.getHours() !== last) {
            last = d.getHours();
            labels += `<span style="left:${((i + .5) / n * 100).toFixed(2)}%">${String(d.getHours()).padStart(2, "0")}:00</span>`;
          }
        }
      }
      return `<div class="box" style="margin-bottom:12px"><h3>${esc(this._t("Total queries (last 24 hours)"))}</h3><div class="body">
        <div class="chart"><svg viewBox="0 0 ${n * 10} ${h}" preserveAspectRatio="none" role="img" aria-label="${esc(this._t("Total queries (last 24 hours)"))}">${bars}</svg></div>
        <div class="axis">${labels}</div>
        <div class="key"><span><i style="background:#f0614b"></i>${esc(this._t("Blocked"))}</span><span><i style="background:#3b8dbd"></i>${esc(this._t("Cached"))}</span><span><i style="background:#00a65a"></i>${esc(this._t("Forwarded"))}</span></div>
      </div></div>`;
    }

    _ring(title, parts) {
      const total = parts.reduce((sum, p) => sum + p.value, 0);
      if (!total) return `<div class="box"><h3>${esc(title)}</h3><div class="empty">${esc(this._t("No data yet"))}</div></div>`;
      const r = 38, circ = 2 * Math.PI * r;
      let offset = 0;
      const rings = parts.map((p) => {
        const len = circ * p.value / total;
        const piece = `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${p.color}" stroke-width="18" stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 50 50)"><title>${esc(p.label)}: ${esc(this._n(p.value))}</title></circle>`;
        offset += len;
        return piece;
      }).join("");
      const legend = parts.map((p) => `<span title="${esc(p.label)}: ${esc(this._n(p.value))}"><i style="background:${p.color}"></i>${esc(p.label)}<small>${esc(this._n(p.value))}</small></span>`).join("");
      return `<div class="box rbox"><h3>${esc(title)}</h3><div class="body"><div class="ring"><svg viewBox="0 0 100 100" role="img" aria-label="${esc(title)}">${rings}</svg><div class="legend">${legend}</div></div></div></div>`;
    }

    _queryTypes(a) {
      const entries = Object.entries(a.query_types && typeof a.query_types === "object" ? a.query_types : {})
        .filter(([, v]) => isNum(v) && v > 0).sort((x, y) => y[1] - x[1]);
      return this._ring(this._t("Query types"), entries.map(([k, v], i) => ({ label: k, value: v, color: TYPE_COLORS[i % TYPE_COLORS.length] })));
    }

    _upstreams(a) {
      const names = arr(a.upstreams);
      const label = (u) => {
        const name = String(u.name ?? u.ip ?? "?");
        if (name === "blocklist") return this._t("Blocklist");
        if (name === "cache") return this._t("Cache");
        const dup = names.filter((x) => (x.name ?? x.ip) === name).length > 1;
        return dup && u.ip && u.ip !== name ? `${name} (${u.ip})` : name;
      };
      return this._ring(this._t("Upstream servers"), names.filter((u) => isNum(u.count) && u.count > 0)
        .map((u, i) => ({ label: label(u), value: u.count, color: UPSTREAM_COLORS[i % UPSTREAM_COLORS.length] })));
    }

    _table(title, head, rows, color, labelKey) {
      const list = arr(rows).filter((r) => isNum(r.count)).slice(0, Math.max(1, Number(this._config.rows) || 10));
      if (!list.length) return `<div class="box"><h3>${esc(title)}</h3><div class="empty">${esc(this._t("No data yet"))}</div></div>`;
      const max = Math.max(1, ...list.map((r) => r.count));
      const body = list.map((r) => `<tr><td class="name" title="${esc(r[labelKey])}">${esc(r[labelKey])}</td><td class="num">${esc(this._n(r.count))}</td>
        <td class="bar"><span style="width:${(r.count / max * 100).toFixed(1)}%;background:${color}"></span></td></tr>`).join("");
      return `<div class="box"><h3>${esc(title)}</h3><table><thead><tr><th>${esc(this._t(head[0]))}</th><th>${esc(this._t(head[1]))}</th><th>${esc(this._t("Frequency"))}</th></tr></thead><tbody>${body}</tbody></table></div>`;
    }

    _render() {
      if (!this._config) return;
      this._rendered = true;
      const c = this._config;
      const show = (key) => c[key] !== false;
      const state = this._hass?.states?.[c.entity];
      const title = c.title === undefined ? "Pi-hole" : c.title;
      let content;
      if (!this._hass) content = "";
      else if (!state || ["unavailable", "unknown"].includes(state.state)) content = `<div class="empty">${esc(this._t("Entity unavailable"))}: ${esc(c.entity)}</div>`;
      else {
        const a = state.attributes ?? {};
        const total = Number(state.state);
        const pair = (...blocks) => { const out = blocks.filter(Boolean).join(""); return out ? `<div class="grid two">${out}</div>` : ""; };
        content = [
          show("show_tiles") ? this._tiles(a, Number.isFinite(total) ? total : null) : "",
          show("show_history") ? this._history(a) : "",
          pair(show("show_query_types") && this._queryTypes(a), show("show_upstreams") && this._upstreams(a)),
          pair(show("show_top_domains") && this._table(this._t("Top permitted domains"), ["Domain", "Hits"], a.top_domains, "#00a65a", "domain"),
            show("show_top_blocked") && this._table(this._t("Top blocked domains"), ["Domain", "Hits"], a.top_blocked, "#f0614b", "domain")),
          pair(show("show_top_clients") && this._table(this._t("Top clients (total)"), ["Client", "Requests"], a.top_clients, "#00a65a", "name"),
            show("show_top_clients_blocked") && this._table(this._t("Top clients (blocked only)"), ["Client", "Requests"], a.top_clients_blocked, "#f0614b", "name")),
        ].join("");
      }
      this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card>${title ? `<div class="title">${esc(title)}</div>` : ""}${content}</ha-card>`;
    }
  }

  class HaPiholeCardEditor extends HTMLElement {
    setConfig(config) { this._config = config; this._draw(); }
    set hass(hass) { this._hass = hass; if (this._form) this._form.hass = hass; else this._draw(); }
    _draw() {
      if (!this._config) return;
      if (!this._form) {
        this._form = document.createElement("ha-form");
        this._form.addEventListener("value-changed", (ev) => {
          const config = { ...ev.detail.value };
          for (const key of Object.keys(config)) if (config[key] === "" || config[key] === undefined) delete config[key];
          this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
        });
        this.appendChild(this._form);
      }
      const t = (text) => translate(this._hass, text);
      this._form.hass = this._hass;
      this._form.data = { rows: 10, ...Object.fromEntries(SECTIONS.map((k) => [k, true])), ...this._config };
      this._form.schema = [
        { name: "entity", selector: { entity: { domain: "sensor" } } },
        { name: "title", selector: { text: {} } },
        { name: "rows", selector: { number: { min: 3, max: 10, mode: "box" } } },
        ...SECTIONS.map((name) => ({ name, selector: { boolean: {} } })),
      ];
      const labels = { entity: "Entity", title: "Title (optional)", rows: "Maximum rows", show_tiles: "Show tiles", show_history: "Show history", show_query_types: "Show query types", show_upstreams: "Show upstream servers", show_top_domains: "Show top permitted domains", show_top_blocked: "Show top blocked domains", show_top_clients: "Show top clients", show_top_clients_blocked: "Show top clients (blocked only)" };
      this._form.computeLabel = (schema) => t(labels[schema.name] ?? schema.name);
    }
  }

  if (!customElements.get(EDITOR)) customElements.define(EDITOR, HaPiholeCardEditor);
  if (!customElements.get(TAG)) customElements.define(TAG, HaPiholeCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === TAG)) {
    window.customCards.push({ type: TAG, name: "Pi-hole Card", description: "Pi-hole statistics: tiles, 24 h history, query types, upstream servers and top lists.", preview: false });
  }
})();
