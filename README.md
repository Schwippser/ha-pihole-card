# HA Pi-hole Card

[![Home Assistant Marketplace](https://img.shields.io/badge/Home%20Assistant-Marketplace-blue.svg)](https://www.home-assistant.io/integrations/marketplace/) ![version](https://img.shields.io/github/v/release/Schwippser/ha-pihole-card?include_prereleases&label=version&color=blue) ![status](https://img.shields.io/badge/status-beta-yellow)

<a href="https://www.buymeacoffee.com/tomreim0s" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me a Coffee" style="height: 60px !important;width: 217px !important;" ></a>

A standalone card (`custom:ha-pihole-card`, with a visual editor) that shows the Pi-hole (v6) dashboard in Home Assistant: tiles, a 24 hour history, **query types**, upstream servers and the top lists for domains and clients.

The standard Pi-hole integration does not provide query types, top domains or top clients. The card therefore reads **one extra sensor** that you create once with the small script in [`data-source/`](data-source). Your Pi-hole password never appears in the dashboard.

*[Deutsche Version](README.de.md)*


## Installation

### MARKETPLACE (custom repository)

[![Open your Home Assistant instance and open this repository in the Marketplace.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Schwippser&repository=ha-pihole-card&category=plugin)

1. MARKETPLACE → ⋮ → **Custom repositories**
2. Repository: `https://github.com/Schwippser/ha-pihole-card`, category **Dashboard**
3. Install **HA Pi-hole Card**. Prereleases are only offered if "Show beta versions" is enabled for the repository in the Marketplace.
4. Reload the browser (clear cache if needed).

### Manual

1. Copy `dist/ha-pihole-card.js` (and the folder `dist/translations`) to `/config/www/ha-pihole-card/`
2. Settings → Dashboards → ⋮ → **Resources** → add `/local/ha-pihole-card/ha-pihole-card.js` as **JavaScript module**

Then create the data source (next chapter).

## 1. Create the data source (one time)

A small script logs in to Pi-hole with an **app password**, reads the statistics and stores them in the sensor `sensor.pi_hole_statistik`. The card only reads this sensor.

1. In Pi-hole create an app password: **Settings → Web interface / API → Configure app password**. Pi-hole shows it only once.
2. Add two lines to `/config/secrets.yaml` (keep the quotation marks, no spaces inside them):
   ```yaml
   pihole_url: "http://192.168.1.2"
   pihole_app_password: "YOUR_APP_PASSWORD"
   ```
   There is no user name in Pi-hole v6, only the password. If Pi-hole does not run on port 80, add the port to the URL (`:8080`).
3. Copy [`data-source/pihole_stats.py`](data-source/pihole_stats.py) to `/config/pihole_stats.py`.
4. Copy [`data-source/pihole_auswertung.yaml`](data-source/pihole_auswertung.yaml) to `/config/packages/pihole_auswertung.yaml`. Packages must be enabled in your `configuration.yaml`:
   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```
5. Keep the sensor out of the database. It carries many attributes that you do not need as history:
   ```yaml
   recorder:
     exclude:
       entities:
         - sensor.pi_hole_statistik
   ```
   (If you already have a `recorder:` block, only add the entity to its `exclude` list.)
6. Check the configuration and **restart** Home Assistant (the recorder needs a full restart).

After the restart `sensor.pi_hole_statistik` exists. Its state is the number of queries, the details are in its attributes. It is updated every 60 seconds.

> The script reads `pihole_url` and `pihole_app_password` directly from `secrets.yaml`, it does not need `!secret` in your configuration. The password is never printed or stored, and the session is logged out after every run.

## 2. Add the card

1. Open a dashboard in edit mode → **Add card** → **HA Pi-hole Card**.
2. Select the sensor in the visual editor, or use YAML:

```yaml
type: custom:ha-pihole-card
entity: sensor.pi_hole_statistik
```

| Option | Default | Description |
|---|---|---|
| `entity` | – | The statistics sensor (required) |
| `title` | `Pi-hole` | Card title, an empty string hides it |
| `rows` | `10` | Rows in the top lists (3–10) |
| `show_tiles` | `true` | Four tiles: total queries, blocked, percent blocked, domains on lists |
| `show_history` | `true` | 24 hour history (blocked / cached / forwarded) |
| `show_query_types` | `true` | Query types ring |
| `show_upstreams` | `true` | Upstream servers ring |
| `show_top_domains` | `true` | Top permitted domains |
| `show_top_blocked` | `true` | Top blocked domains |
| `show_top_clients` | `true` | Top clients |
| `show_top_clients_blocked` | `true` | Top clients (blocked only) |

The card uses the Home Assistant theme colors. The UI is English; a German translation is built in, other languages can be added as `translations/<language>.json`.

## Troubleshooting

- **The sensor does not appear:** Check the configuration, make sure packages are enabled and that Home Assistant was restarted. Look for `command_line` in Settings → System → Logs.
- **The sensor is `unavailable`:** The log names the cause: wrong app password, wrong URL or a missing entry in `secrets.yaml`. Open `pihole_url` in a browser from the Home Assistant network to check the address.
- **No data in a section:** The card hides nothing by itself, a section shows "No data yet" when Pi-hole delivers nothing for it (for example right after a Pi-hole restart).
- **The sensor is not found in the editor:** The entity ID follows the name of the sensor (`Pi-hole Statistik` becomes `sensor.pi_hole_statistik`). Use exactly this ID in `entity` and in the recorder.
