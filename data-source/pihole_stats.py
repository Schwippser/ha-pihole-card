#!/usr/bin/env python3
"""Holt Statistiken von Pi-hole v6 und gibt sie als JSON aus (fuer den HA-command_line-Sensor).

Liest pihole_url und pihole_app_password aus /config/secrets.yaml.
Das Passwort wird nie ausgegeben oder gespeichert. Die Sitzung wird am Ende abgemeldet.
"""
import json
import ssl
import sys
import urllib.error
import urllib.request

SECRETS = "/config/secrets.yaml"
TIMEOUT = 15


def read_secrets():
    import yaml  # gehoert zu Home Assistant
    with open(SECRETS, encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    url = str(data.get("pihole_url", "")).rstrip("/")
    password = str(data.get("pihole_app_password", ""))
    if not url or not password:
        raise SystemExit("pihole_url oder pihole_app_password fehlt in secrets.yaml")
    return url, password


def main():
    url, password = read_secrets()
    ctx = ssl.create_default_context()
    if url.startswith("https"):  # lokales Zertifikat von Pi-hole ist meist selbst signiert
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

    def call(method, path, body=None, sid=None):
        headers = {"Accept": "application/json"}
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        if sid:
            headers["sid"] = sid
        req = urllib.request.Request(url + "/api" + path, data=data, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as resp:
            raw = resp.read()
        return json.loads(raw) if raw else {}

    try:
        auth = call("POST", "/auth", {"password": password})
    except urllib.error.HTTPError as err:
        raise SystemExit(f"Anmeldung bei Pi-hole fehlgeschlagen (HTTP {err.code})")
    session = auth.get("session") or {}
    sid = session.get("sid")
    if not session.get("valid") or not sid:
        raise SystemExit("Anmeldung bei Pi-hole abgelehnt (App-Passwort pruefen)")

    def get(path, default=None):
        try:
            return call("GET", path, sid=sid)
        except Exception:
            return default

    try:
        summary = get("/stats/summary")
        if summary is None:
            raise SystemExit("Pi-hole lieferte keine Zusammenfassung")
        queries = summary.get("queries") or {}
        clients = summary.get("clients") or {}
        gravity = summary.get("gravity") or {}
        qtypes = (get("/stats/query_types") or {}).get("types") or queries.get("types") or {}
        upstreams = (get("/stats/upstreams") or {}).get("upstreams") or []
        top_ok = (get("/stats/top_domains?count=10") or {}).get("domains") or []
        top_blocked = (get("/stats/top_domains?blocked=true&count=10") or {}).get("domains") or []
        top_clients = (get("/stats/top_clients?count=10") or {}).get("clients") or []
        top_clients_blocked = (get("/stats/top_clients?blocked=true&count=10") or {}).get("clients") or []
        history = (get("/history") or {}).get("history") or []

        out = {
            "total": queries.get("total"),
            "blocked": queries.get("blocked"),
            "percent_blocked": queries.get("percent_blocked"),
            "cached": queries.get("cached"),
            "forwarded": queries.get("forwarded"),
            "unique_domains": queries.get("unique_domains"),
            "frequency": queries.get("frequency"),
            "clients_active": clients.get("active"),
            "clients_total": clients.get("total"),
            "domains_on_lists": gravity.get("domains_being_blocked"),
            "gravity_last_update": gravity.get("last_update"),
            "query_types": {k: v for k, v in qtypes.items() if v},
            "upstreams": [
                {"name": u.get("name") or u.get("ip"), "ip": u.get("ip"), "count": u.get("count")}
                for u in upstreams
            ],
            "top_domains": [{"domain": d.get("domain"), "count": d.get("count")} for d in top_ok],
            "top_blocked": [{"domain": d.get("domain"), "count": d.get("count")} for d in top_blocked],
            "top_clients": [
                {"name": c.get("name") or c.get("ip"), "ip": c.get("ip"), "count": c.get("count")}
                for c in top_clients
            ],
            "top_clients_blocked": [
                {"name": c.get("name") or c.get("ip"), "ip": c.get("ip"), "count": c.get("count")}
                for c in top_clients_blocked
            ],
            "hist_start": history[0].get("timestamp") if history else None,
            "hist_cached": [h.get("cached", 0) for h in history],
            "hist_forwarded": [h.get("forwarded", 0) for h in history],
            "hist_total": [h.get("total", 0) for h in history],
            "hist_blocked": [h.get("blocked", 0) for h in history],
        }
        print(json.dumps(out, separators=(",", ":")))
    finally:
        try:
            call("DELETE", "/auth", sid=sid)
        except Exception:
            pass


if __name__ == "__main__":
    try:
        main()
    except SystemExit as exc:
        if exc.code not in (0, None):
            print(exc.code, file=sys.stderr)
            sys.exit(1)
        raise
    except Exception as exc:  # keine Details mit Zugangsdaten ausgeben
        print(f"Fehler: {type(exc).__name__}", file=sys.stderr)
        sys.exit(1)
