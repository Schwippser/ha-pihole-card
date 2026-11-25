# HA Pi-hole Card

[![Home Assistant Marketplace](https://img.shields.io/badge/Home%20Assistant-Marketplace-blue.svg)](https://www.home-assistant.io/integrations/marketplace/) ![version](https://img.shields.io/github/v/release/Schwippser/ha-pihole-card?include_prereleases&label=version&color=blue) ![status](https://img.shields.io/badge/status-beta-yellow)

<a href="https://www.buymeacoffee.com/tomreim0s" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me a Coffee" style="height: 60px !important;width: 217px !important;" ></a>

Eine eigenständige Karte (`custom:ha-pihole-card`, mit visuellem Editor), die das Pi-hole-Dashboard (v6) in Home Assistant zeigt: Kacheln, einen 24-Stunden-Verlauf, **Abfragetypen**, Upstream-Server und die Toplisten für Domains und Clients.

Die Standard-Integration von Pi-hole liefert keine Abfragetypen, Top-Domains und Top-Clients. Die Karte liest deshalb **einen zusätzlichen Sensor**, den du einmalig mit dem kleinen Skript aus [`data-source/`](data-source) anlegst. Dein Pi-hole-Passwort steht dabei nie im Dashboard.

*[English version](README.md)*


## Installation

### MARKETPLACE (benutzerdefiniertes Repository)

[![Open your Home Assistant instance and open this repository in the Marketplace.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Schwippser&repository=ha-pihole-card&category=plugin)

1. MARKETPLACE → ⋮ → **Benutzerdefinierte Repositories**
2. Repository: `https://github.com/Schwippser/ha-pihole-card`, Kategorie **Dashboard**
3. **HA Pi-hole Card** installieren. Vorabversionen bietet der Marketplace nur an, wenn für das Repository „Beta-Versionen anzeigen“ aktiviert ist.
4. Browser neu laden (ggf. Cache leeren).

### Manuell

1. `dist/ha-pihole-card.js` (und den Ordner `dist/translations`) nach `/config/www/ha-pihole-card/` kopieren
2. Einstellungen → Dashboards → ⋮ → **Ressourcen** → `/local/ha-pihole-card/ha-pihole-card.js` als **JavaScript-Modul** hinzufügen

Danach die Datenquelle anlegen (nächstes Kapitel).

## 1. Die Datenquelle anlegen (einmalig)

Ein kleines Skript meldet sich mit einem **App-Passwort** bei Pi-hole an, liest die Statistik und legt sie im Sensor `sensor.pi_hole_statistik` ab. Die Karte liest nur diesen Sensor.

1. In Pi-hole ein App-Passwort erzeugen: **Einstellungen → Web-Interface / API → App-Passwort konfigurieren**. Pi-hole zeigt es nur einmal an.
2. Zwei Zeilen in `/config/secrets.yaml` eintragen (Anführungszeichen beibehalten, keine Leerzeichen darin):
   ```yaml
   pihole_url: "http://192.168.1.2"
   pihole_app_password: "DEIN_APP_PASSWORT"
   ```
   Pi-hole v6 hat keinen Benutzernamen, nur das Passwort. Läuft Pi-hole nicht auf Port 80, hängst du den Port an die Adresse an (`:8080`).
3. [`data-source/pihole_stats.py`](data-source/pihole_stats.py) nach `/config/pihole_stats.py` kopieren.
4. [`data-source/pihole_auswertung.yaml`](data-source/pihole_auswertung.yaml) nach `/config/packages/pihole_auswertung.yaml` kopieren. Packages müssen in der `configuration.yaml` aktiviert sein:
   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```
5. Den Sensor aus der Datenbank heraushalten. Er trägt viele Attribute, die du nicht als Verlauf brauchst:
   ```yaml
   recorder:
     exclude:
       entities:
         - sensor.pi_hole_statistik
   ```
   (Hast du schon einen `recorder:`-Block, ergänzt du die Entität nur in dessen `exclude`-Liste.)
6. Konfiguration prüfen und Home Assistant **neu starten** (der Recorder braucht einen vollständigen Neustart).

Nach dem Neustart gibt es `sensor.pi_hole_statistik`. Sein Zustand ist die Anzahl der Anfragen, die Details stehen in den Attributen. Er wird alle 60 Sekunden aktualisiert.

> Das Skript liest `pihole_url` und `pihole_app_password` direkt aus der `secrets.yaml`, du brauchst dafür kein `!secret` in deiner Konfiguration. Das Passwort wird nie ausgegeben oder gespeichert, und die Sitzung wird nach jedem Lauf abgemeldet.

## 2. Die Karte hinzufügen

1. Ein Dashboard im Bearbeitungsmodus öffnen → **Karte hinzufügen** → **HA Pi-hole Card**.
2. Im visuellen Editor den Sensor auswählen, oder per YAML:

```yaml
type: custom:ha-pihole-card
entity: sensor.pi_hole_statistik
```

| Option | Standard | Beschreibung |
|---|---|---|
| `entity` | – | Der Statistik-Sensor (erforderlich) |
| `title` | `Pi-hole` | Titel der Karte, ein leerer Text blendet ihn aus |
| `rows` | `10` | Zeilen in den Toplisten (3–10) |
| `show_tiles` | `true` | Vier Kacheln: Anfragen gesamt, blockiert, Anteil blockiert, Domains auf Listen |
| `show_history` | `true` | 24-Stunden-Verlauf (blockiert / Cache / weitergeleitet) |
| `show_query_types` | `true` | Ring der Abfragetypen |
| `show_upstreams` | `true` | Ring der Upstream-Server |
| `show_top_domains` | `true` | Top erlaubte Domains |
| `show_top_blocked` | `true` | Top blockierte Domains |
| `show_top_clients` | `true` | Top Clients |
| `show_top_clients_blocked` | `true` | Top Clients (nur blockiert) |

Die Karte nutzt die Farben deines Home-Assistant-Themes. Die Oberfläche ist englisch, eine deutsche Übersetzung ist eingebaut, weitere Sprachen lassen sich als `translations/<sprache>.json` ergänzen.

## Fehlersuche

- **Der Sensor erscheint nicht:** Konfiguration prüfen, sicherstellen, dass Packages aktiv sind und Home Assistant neu gestartet wurde. Unter Einstellungen → System → Protokolle nach `command_line` suchen.
- **Der Sensor ist `unavailable`:** Das Protokoll nennt die Ursache: falsches App-Passwort, falsche Adresse oder ein fehlender Eintrag in der `secrets.yaml`. Öffne `pihole_url` zur Probe im Browser, aus dem Netzwerk von Home Assistant.
- **In einem Abschnitt stehen keine Daten:** Die Karte blendet nichts selbst aus. Ein Abschnitt zeigt „Noch keine Daten“, wenn Pi-hole dafür nichts liefert (zum Beispiel direkt nach einem Neustart von Pi-hole).
- **Der Sensor wird im Editor nicht gefunden:** Die Entitäts-ID folgt dem Namen des Sensors (`Pi-hole Statistik` wird zu `sensor.pi_hole_statistik`). Diese ID trägst du in `entity` und im Recorder ein.
