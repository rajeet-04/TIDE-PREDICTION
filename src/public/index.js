export const dashboardHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tide Prediction Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
    <style>
        :root {
            --bg-deep: #0a0f18;
            --bg-marine: #111a2c;
            --accent-cyan: #00f2fe;
            --accent-blue: #4facfe;
            --accent-glow: rgba(0, 242, 254, 0.35);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --glass-bg: rgba(17, 26, 44, 0.75);
            --glass-border: rgba(255, 255, 255, 0.08);
            --border-radius: 16px;
            --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-deep);
            background-image:
                radial-gradient(circle at 15% 50%, rgba(79,172,254,0.12), transparent 40%),
                radial-gradient(circle at 85% 20%, rgba(0,242,254,0.08), transparent 40%);
            background-attachment: fixed;
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
        }

        h1,h2,h3,h4 { font-family: 'Outfit', sans-serif; font-weight: 600; }

        .container { max-width: 1280px; margin: 0 auto; padding: 2rem 1.5rem; width: 100%; flex-grow: 1; }

        /* ── Header ── */
        header { text-align: center; margin-bottom: 2.5rem; }
        .logo-wrap { display: inline-flex; align-items: center; gap: 12px; margin-bottom: 6px; }
        .logo-icon { color: var(--accent-cyan); filter: drop-shadow(0 0 8px var(--accent-glow)); }
        header h1 {
            font-size: 2.5rem;
            background: linear-gradient(135deg, #fff 40%, var(--accent-cyan));
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            letter-spacing: -0.5px;
        }
        header p { color: var(--text-muted); font-size: 1rem; margin-top: 4px; }

        /* ── Glass Panel ── */
        .glass-panel {
            background: var(--glass-bg);
            backdrop-filter: blur(16px);
            border: 1px solid var(--glass-border);
            border-radius: var(--border-radius);
            padding: 1.5rem;
            box-shadow: 0 8px 32px rgba(0,0,0,0.25);
        }

        /* ── Error ── */
        #error-banner {
            display: none;
            background: rgba(239,68,68,0.12);
            border: 1px solid rgba(239,68,68,0.3);
            color: #fca5a5;
            padding: 0.875rem 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            align-items: center;
            gap: 0.75rem;
        }

        /* ── Controls ── */
        .controls { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; align-items: flex-end; }
        .ctrl-group { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; min-width: 160px; }
        .ctrl-group label {
            font-size: 0.78rem; color: var(--text-muted);
            text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;
        }
        input, select {
            background: rgba(0,0,0,0.35); border: 1px solid var(--glass-border);
            color: var(--text-main); padding: 0.7rem 0.9rem;
            border-radius: 8px; font-family: inherit; font-size: 0.95rem;
            transition: var(--transition); width: 100%;
        }
        input:focus, select:focus {
            outline: none; border-color: var(--accent-blue);
            box-shadow: 0 0 0 3px rgba(79,172,254,0.15);
        }
        select option { background: #1a2640; }

        /* ── Station Picker ── */
        .station-picker-wrap {
            position: relative; flex: 2; min-width: 240px;
        }
        #station-search {
            width: 100%;
            padding-right: 2.5rem;
        }
        .search-spinner {
            position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
            width: 16px; height: 16px;
            border: 2px solid rgba(255,255,255,0.1);
            border-top-color: var(--accent-cyan);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            display: none;
        }
        #station-dropdown {
            position: fixed; z-index: 9999;
            background: #121f36;
            border: 1px solid var(--glass-border);
            border-radius: 10px;
            max-height: 280px; overflow-y: auto;
            box-shadow: 0 16px 40px rgba(0,0,0,0.6);
            display: none;
            min-width: 280px;
        }
        #station-dropdown .group-header {
            font-size: 0.72rem; color: var(--accent-cyan); text-transform: uppercase;
            letter-spacing: 1px; padding: 0.6rem 1rem 0.3rem; font-weight: 600;
            position: sticky; top: 0; background: #121f36;
        }
        #station-dropdown .station-item {
            padding: 0.6rem 1rem; cursor: pointer; font-size: 0.9rem;
            display: flex; justify-content: space-between; align-items: center;
            gap: 0.5rem; transition: background 0.15s;
            border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        #station-dropdown .station-item:hover { background: rgba(79,172,254,0.12); }
        #station-dropdown .station-item .sta-name { flex: 1; color: #e2e8f0; }
        #station-dropdown .station-item .sta-id { font-size: 0.72rem; color: var(--text-muted); font-family: monospace; }
        #station-dropdown .no-results { padding: 1rem; color: var(--text-muted); font-size: 0.9rem; text-align: center; }

        /* ── Buttons ── */
        .btn-row { display: flex; gap: 0.75rem; align-items: center; }
        button {
            background: linear-gradient(135deg, var(--accent-blue), var(--accent-cyan));
            color: #000; border: none; padding: 0.7rem 1.4rem;
            border-radius: 8px; font-family: 'Outfit', sans-serif; font-weight: 600;
            font-size: 0.95rem; cursor: pointer; display: inline-flex; align-items: center;
            gap: 0.45rem; transition: var(--transition); white-space: nowrap;
            box-shadow: 0 4px 15px var(--accent-glow);
        }
        button:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,242,254,0.5); }
        button:active { transform: translateY(0); }
        button.ghost {
            background: rgba(255,255,255,0.05); color: var(--text-main);
            border: 1px solid var(--glass-border); box-shadow: none; padding: 0.7rem;
        }
        button.ghost:hover { background: rgba(255,255,255,0.1); }

        /* ── Dashboard Grid ── */
        #dashboard-content {
            opacity: 0; transform: translateY(16px);
            transition: opacity 0.5s ease, transform 0.5s ease;
            display: grid; grid-template-columns: 280px 1fr; gap: 1.5rem;
            position: relative;
        }
        #dashboard-content.visible { opacity: 1; transform: translateY(0); }

        /* Loading */
        #loading-overlay {
            display: none; position: absolute; inset: 0;
            background: rgba(10,15,24,0.65); backdrop-filter: blur(4px);
            border-radius: var(--border-radius); z-index: 50;
            align-items: center; justify-content: center; flex-direction: column; gap: 1rem;
        }
        .spinner {
            width: 36px; height: 36px;
            border: 3px solid rgba(255,255,255,0.08);
            border-radius: 50%; border-top-color: var(--accent-cyan);
            animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Stat Cards (Left Col) ── */
        .stats-col { display: flex; flex-direction: column; gap: 1.25rem; }

        .stat-card {
            text-align: center; padding: 1.75rem 1.25rem;
            position: relative; overflow: hidden;
        }
        .stat-card::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
            background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan));
        }
        .stat-icon { color: var(--accent-cyan); margin-bottom: 0.4rem; display: inline-block; }
        .stat-value {
            font-family: 'Outfit', sans-serif; font-size: 3rem; font-weight: 700;
            line-height: 1; margin: 0.4rem 0; color: #fff;
        }
        .stat-label {
            color: var(--text-muted); font-size: 0.78rem;
            text-transform: uppercase; letter-spacing: 1px;
        }
        .station-info {
            font-size: 0.82rem; color: var(--accent-blue); margin-top: 0.9rem;
            display: flex; align-items: center; justify-content: center; gap: 4px;
        }
        .weather-grid {
            display: flex; flex-direction: column; gap: 0.5rem; padding: 0;
        }
        .weather-row {
            display: flex; justify-content: space-between; align-items: center;
            font-size: 0.88rem; padding: 0.4rem 0;
            border-bottom: 1px solid var(--glass-border);
        }
        .weather-row:last-child { border-bottom: none; }
        .weather-row span:first-child { color: var(--text-muted); }
        .weather-row span:last-child { font-family: 'Outfit', sans-serif; font-weight: 500; }

        /* ── Chart (Right Col) ── */
        .chart-col { display: flex; flex-direction: column; gap: 1.25rem; }
        .chart-container { height: 360px; width: 100%; position: relative; }

        /* ── Extremes ── */
        .extremes-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; }
        .extreme-card {
            background: rgba(0,0,0,0.2); border-radius: 10px; padding: 0.9rem 1rem;
            display: flex; align-items: center; gap: 0.75rem;
            border: 1px solid transparent; transition: var(--transition);
        }
        .extreme-card:hover { border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); }
        .ex-icon.high { color: #34d399; } .ex-icon.low { color: #f87171; }
        .ex-details h4 { font-size: 0.78rem; color: var(--text-muted); margin-bottom: 2px; }
        .ex-details .extime { font-family: 'Outfit', sans-serif; font-size: 1.05rem; font-weight: 600; }
        .ex-details .exlevel { font-size: 0.78rem; color: var(--accent-cyan); margin-top: 1px; }

        footer { text-align: center; padding: 2rem 0; color: var(--text-muted); font-size: 0.85rem; margin-top: 2rem; }

        /* Responsive */
        @media (max-width: 1024px) { #dashboard-content { grid-template-columns: 1fr; } }
        @media (max-width: 900px) {
            .stats-col { flex-direction: row; flex-wrap: wrap; }
            .stat-card { flex: 1; min-width: 180px; }
        }
        @media (max-width: 600px) {
            header h1 { font-size: 1.9rem; }
            .chart-container { height: 280px; }
            .stats-col { flex-direction: column; }
        }
    </style>
</head>
<body>
<div class="container">
    <header>
        <div class="logo-wrap">
            <i data-lucide="waves" class="logo-icon" width="34" height="34"></i>
            <h1>Tide Prediction</h1>
        </div>
        <p>Harmonic analysis + meteorological corrections • Cloudflare Edge</p>
    </header>

    <div id="error-banner">
        <i data-lucide="alert-circle" width="18"></i>
        <span id="error-message">Error fetching data.</span>
    </div>

    <!-- Controls -->
    <section class="glass-panel" style="margin-bottom:1.5rem;">
        <div class="controls">

            <!-- Station Search Picker -->
            <div class="ctrl-group station-picker-wrap" style="flex:3; min-width:260px;">
                <label><i data-lucide="search" width="12" style="vertical-align:middle; margin-right:3px;"></i> Search Station</label>
                <div style="position:relative;">
                    <input type="text" id="station-search" placeholder="Type a station name or city..." autocomplete="off">
                    <div class="search-spinner" id="search-spinner"></div>
                    <div id="station-dropdown"></div>
                </div>
            </div>

            <!-- Manual lat/lon -->
            <div class="ctrl-group" style="min-width:110px; max-width:130px;">
                <label>Latitude</label>
                <input type="number" id="lat-input" placeholder="Lat" step="0.0001" value="22.193">
            </div>
            <div class="ctrl-group" style="min-width:110px; max-width:130px;">
                <label>Longitude</label>
                <input type="number" id="lon-input" placeholder="Lon" step="0.0001" value="88.185">
            </div>

            <!-- Units -->
            <div class="ctrl-group" style="min-width:120px; max-width:140px;">
                <label>Units</label>
                <select id="units-select">
                    <option value="meters">Meters</option>
                    <option value="feet">Feet</option>
                </select>
            </div>

            <!-- Buttons -->
            <div class="ctrl-group" style="min-width:auto; flex:none;">
                <label style="visibility:hidden;">Go</label>
                <div class="btn-row">
                    <button class="ghost" id="btn-locate" title="Use my location">
                        <i data-lucide="map-pin" width="18"></i>
                    </button>
                    <button id="btn-forecast">
                        <i data-lucide="activity" width="16"></i> Forecast
                    </button>
                </div>
            </div>
        </div>
    </section>

    <!-- Dashboard -->
    <section id="dashboard-content">
        <div id="loading-overlay">
            <div class="spinner"></div>
            <p style="color:var(--text-muted); font-size:0.9rem;">Computing tides…</p>
        </div>

        <!-- Left Col: Stats -->
        <div class="stats-col">
            <div class="stat-card glass-panel">
                <div class="stat-icon"><i data-lucide="droplets" width="28" height="28"></i></div>
                <div class="stat-label">Current Water Level</div>
                <div class="stat-value" id="val-current">--</div>
                <div class="stat-label" id="val-units" style="font-size:0.75rem;">meters</div>
                <div class="station-info">
                    <i data-lucide="anchor" width="12"></i>
                    <span id="val-station" title="">Diamond Harbour</span>
                </div>
            </div>

            <div class="glass-panel" style="padding:1.25rem;">
                <div style="font-size:0.78rem; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); margin-bottom:0.75rem; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="cloud-rain" width="14"></i> Met Correction
                </div>
                <div class="weather-grid">
                    <div class="weather-row"><span>Pressure</span><span id="val-w-pressure">-- hPa</span></div>
                    <div class="weather-row"><span>Wind</span><span id="val-w-wind">-- m/s</span></div>
                    <div class="weather-row"><span>Temp</span><span id="val-w-temp">--°C</span></div>
                    <div class="weather-row">
                        <span>Net offset</span>
                        <span id="val-w-effect" style="color:var(--accent-cyan); font-weight:600;">--</span>
                    </div>
                </div>
            </div>

            <div class="glass-panel" style="padding:1.25rem;">
                <div style="font-size:0.78rem; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); margin-bottom:0.75rem; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="cpu" width="14"></i> Engine
                </div>
                <div id="val-engine" style="font-family:'Outfit'; font-size:1rem; color:#e2e8f0;">--</div>
                <div id="val-datum" style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Datum: --</div>
            </div>
        </div>

        <!-- Right Col: Chart + Extremes -->
        <div class="chart-col">
            <div class="glass-panel">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3 style="font-size:1.1rem; display:flex; align-items:center; gap:8px;">
                        <i data-lucide="bar-chart-2" width="18" class="logo-icon"></i> 24-Hour Timeline
                    </h3>
                    <span style="font-size:0.78rem; color:var(--text-muted);" id="chart-range">--</span>
                </div>
                <div class="chart-container">
                    <canvas id="tideChart"></canvas>
                </div>
            </div>

            <div class="glass-panel">
                <h3 style="font-size:1rem; color:var(--text-muted); margin-bottom:0.9rem; display:flex; align-items:center; gap:8px;">
                    <i data-lucide="arrow-up-down" width="16"></i> Upcoming Extremes
                </h3>
                <div class="extremes-row" id="extremes-container">
                    <!-- populated by JS -->
                </div>
            </div>
        </div>
    </section>
</div>
<footer>Tide Prediction Engine — Cloudflare D1 + KV • Harmonic + Meteorological Layers</footer>

<script>
lucide.createIcons();

const BASE = window.location.origin;
const $ = id => document.getElementById(id);

// State
let tideChart = null;
let searchTimer = null;
let indianStations = [];
let selectedStation = null;

// ─── Station Search ───────────────────────────────────────

const searchInput  = $('station-search');
const searchSpinner = $('search-spinner');
// Portal dropdown to body so it escapes all stacking contexts
const dropdown = $('station-dropdown');
document.body.appendChild(dropdown);

function positionDropdown() {
    const rect = searchInput.getBoundingClientRect();
    dropdown.style.top  = (rect.bottom + 4) + 'px';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.width = rect.width + 'px';
}

// Load Indian stations on page load
async function loadIndianStations() {
    try {
        const res = await fetch(BASE + '/api/stations/india');
        const data = await res.json();
        indianStations = (data.stations || []).filter(s => s.lat != null && s.lon != null);
    } catch (e) {
        console.warn('Could not load Indian stations:', e);
    }
}

function renderDropdown(stations, groupLabel, isDefault = false) {
    if (!stations || stations.length === 0) {
        dropdown.innerHTML = '<div class="no-results">No stations found.</div>';
        return;
    }

    const grouped = isDefault
        ? \`<div class="group-header">\${groupLabel} (\${stations.length})</div>\`
        : (groupLabel
            ? \`<div class="group-header">Search Results (\${stations.length})</div>\`
            : '');

    const items = stations.slice(0, 120).map(s => {
        const name = s.name || s.id;
        const id = s.id || '';
        return \`<div class="station-item" data-lat="\${s.lat}" data-lon="\${s.lon}" data-name="\${name}" data-id="\${id}">
            <span class="sta-name">\${name}</span>
            <span class="sta-id">\${id.split('/').pop()}</span>
        </div>\`;
    }).join('');

    dropdown.innerHTML = grouped + items;
    positionDropdown();
    dropdown.style.display = 'block';

    // Attach click events
    dropdown.querySelectorAll('.station-item').forEach(el => {
        el.addEventListener('click', () => {
            const lat = parseFloat(el.dataset.lat);
            const lon = parseFloat(el.dataset.lon);
            if (isNaN(lat) || isNaN(lon)) {
                showError('No coordinates available for this station.');
                dropdown.style.display = 'none';
                return;
            }
            $('lat-input').value = lat.toFixed(4);
            $('lon-input').value = lon.toFixed(4);
            searchInput.value = el.dataset.name;
            dropdown.style.display = 'none';
            fetchData();
        });
    });
}

// Keyboard: open default list on focus
searchInput.addEventListener('focus', () => {
    const q = searchInput.value.trim();
    if (q.length < 2 && indianStations.length > 0) {
        renderDropdown(indianStations, 'Indian Subcontinent', true);
    }
    positionDropdown();
    dropdown.style.display = 'block';
});

// Reposition on scroll or resize
window.addEventListener('scroll', () => { if (dropdown.style.display !== 'none') positionDropdown(); }, true);
window.addEventListener('resize', () => { if (dropdown.style.display !== 'none') positionDropdown(); });

// Hide on outside click
document.addEventListener('click', e => {
    if (!e.target.closest('.station-picker-wrap')) {
        dropdown.style.display = 'none';
    }
});

// Search as you type
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = searchInput.value.trim();

    if (q.length === 0) {
        renderDropdown(indianStations, 'Indian Subcontinent', true);
        return;
    }

    if (q.length < 2) {
        dropdown.innerHTML = '<div class="no-results">Type at least 2 characters…</div>';
        positionDropdown();
        dropdown.style.display = 'block';
        return;
    }

    // First filter Indian stations client-side instantly
    const indiaHits = indianStations.filter(s =>
        (s.name || s.id).toLowerCase().includes(q.toLowerCase())
    );

    // Show India results immediately while we wait for global
    dropdown.innerHTML = '';
    if (indiaHits.length > 0) {
        renderDropdown(indiaHits, 'Indian Subcontinent');
    }

    // Then search globally
    searchTimer = setTimeout(async () => {
        searchSpinner.style.display = 'block';
        try {
            const res = await fetch(\`\${BASE}/api/stations/search?q=\${encodeURIComponent(q)}&limit=40\`);
            const data = await res.json();
            const global = (data.stations || []).filter(s => !indianStations.some(i => i.id === s.id));

            if (indiaHits.length === 0 && global.length === 0) {
                dropdown.innerHTML = '<div class="no-results">No stations found.</div>';
                dropdown.style.display = 'block';
            } else {
                // Rebuild with two sections
                let html = '';
                if (indiaHits.length > 0) {
                    html += \`<div class="group-header">Indian Subcontinent (\${indiaHits.length})</div>\`;
                    html += indiaHits.slice(0, 60).map(s => stationItemHtml(s)).join('');
                }
                if (global.length > 0) {
                    html += \`<div class="group-header">Global (\${global.length})</div>\`;
                    html += global.slice(0, 60).map(s => stationItemHtml(s)).join('');
                }
                dropdown.innerHTML = html;
                dropdown.style.display = 'block';
                dropdown.querySelectorAll('.station-item').forEach(attachStationClick);
            }
        } catch (e) { console.warn('Search error', e); }
        finally { searchSpinner.style.display = 'none'; }
    }, 350);
});

function stationItemHtml(s) {
    const name = s.name || s.id;
    const id = s.id || '';
    return \`<div class="station-item" data-lat="\${s.lat}" data-lon="\${s.lon}" data-name="\${name}" data-id="\${id}">
        <span class="sta-name">\${name}</span>
        <span class="sta-id">\${id.split('/').pop()}</span>
    </div>\`;
}

function attachStationClick(el) {
    el.addEventListener('click', () => {
        const lat = parseFloat(el.dataset.lat);
        const lon = parseFloat(el.dataset.lon);
        if (isNaN(lat) || isNaN(lon)) {
            showError('No coordinates available for this station.');
            dropdown.style.display = 'none';
            return;
        }
        $('lat-input').value = lat.toFixed(4);
        $('lon-input').value = lon.toFixed(4);
        searchInput.value = el.dataset.name;
        dropdown.style.display = 'none';
        fetchData();
    });
}

// ─── Geolocation ────────────────────────────────────────

$('btn-locate').addEventListener('click', () => {
    if (!navigator.geolocation) return showError('Geolocation not supported.');
    $('btn-locate').innerHTML = '<div class="spinner" style="width:16px;height:16px;border-top-color:#000;"></div>';
    navigator.geolocation.getCurrentPosition(
        pos => {
            $('lat-input').value = pos.coords.latitude.toFixed(4);
            $('lon-input').value = pos.coords.longitude.toFixed(4);
            searchInput.value = '';
            $('btn-locate').innerHTML = '<i data-lucide="map-pin" width="18"></i>';
            lucide.createIcons();
            fetchData();
        },
        () => {
            showError('Location access denied.');
            $('btn-locate').innerHTML = '<i data-lucide="map-pin" width="18"></i>';
            lucide.createIcons();
        }
    );
});

$('btn-forecast').addEventListener('click', fetchData);

function showError(msg) {
    $('error-message').textContent = msg;
    $('error-banner').style.display = 'flex';
    setTimeout(() => $('error-banner').style.display = 'none', 5000);
}

// ─── Fetch & Render ──────────────────────────────────────

async function fetchData() {
    const lat = parseFloat($('lat-input').value);
    const lon = parseFloat($('lon-input').value);
    const units = $('units-select').value;

    if (isNaN(lat) || isNaN(lon)) return showError('Enter valid decimal coordinates.');

    $('error-banner').style.display = 'none';
    $('loading-overlay').style.display = 'flex';
    $('dashboard-content').classList.add('visible');

    try {
        const now = new Date();
        const start = now.toISOString();
        const end = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

        const [curRes, extRes, tlRes] = await Promise.all([
            fetch(\`\${BASE}/api/tide/current?lat=\${lat}&lon=\${lon}&units=\${units}\`),
            fetch(\`\${BASE}/api/tide/extremes?lat=\${lat}&lon=\${lon}&start=\${start}&end=\${end}&units=\${units}\`),
            fetch(\`\${BASE}/api/tide/timeline?lat=\${lat}&lon=\${lon}&start=\${start}&end=\${end}&units=\${units}&interval=600\`)
        ]);

        if (!curRes.ok || !extRes.ok || !tlRes.ok) throw new Error('API error: check coordinates.');

        const [cur, ext, tl] = await Promise.all([curRes.json(), extRes.json(), tlRes.json()]);
        renderAll(cur, ext, tl, units, now, end);

    } catch (err) {
        showError(err.message || 'Failed to fetch.');
    } finally {
        $('loading-overlay').style.display = 'none';
    }
}

function renderAll(cur, ext, tl, units, startDate, endDate) {
    const lvl    = cur.prediction ? cur.prediction.corrected : cur.level;
    const datum  = cur.prediction ? cur.prediction.datum : cur.datum;
    const wthr   = cur.weather || {};
    const corr   = cur.prediction ? cur.prediction.corrections : null;
    const engine = cur.engine || cur.meta?.engine || 'neaps';

    $('val-current').textContent  = typeof lvl === 'number' ? lvl.toFixed(2) : '--';
    $('val-units').textContent    = units;
    $('val-datum').textContent    = 'Datum: ' + (datum || 'N/A');
    $('val-engine').textContent   = engine === 'custom-harmonic' ? '⚙ Custom Harmonic' : '🌐 Neaps (UHSLC)';

    const sta = cur.station;
    if (sta) {
        const km = sta.distance ? \` · \${(sta.distance/1000).toFixed(1)}km away\` : '';
        $('val-station').textContent = (sta.name || sta.id) + km;
        $('val-station').title = sta.id;
        // Sync search box if empty
        if (!$('station-search').value) $('station-search').value = sta.name || '';
    }

    $('val-w-pressure').textContent = wthr.pressure_msl  ? \`\${wthr.pressure_msl.toFixed(1)} hPa\` : 'N/A';
    $('val-w-wind').textContent     = wthr.wind_speed    ? \`\${wthr.wind_speed.toFixed(1)} m/s\` : 'N/A';
    $('val-w-temp').textContent     = wthr.temperature   ? \`\${wthr.temperature.toFixed(1)}°C\` : 'N/A';
    $('val-w-effect').textContent   = corr ? \`\${corr.total >= 0 ? '+' : ''}\${corr.total.toFixed(3)} \${units === 'meters' ? 'm' : 'ft'}\` : 'N/A';

    const sd = new Date(startDate), ed = new Date(endDate);
    $('chart-range').textContent = \`\${sd.toLocaleDateString()} \${sd.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} → \${ed.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}\`;

    // Extremes
    const exCon = $('extremes-container');
    exCon.innerHTML = '';
    (ext.extremes || []).slice(0, 4).forEach(ex => {
        const isHigh = ex.high || ex.label === 'High';
        const t = new Date(ex.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const d = new Date(ex.time).toLocaleDateString([], {month:'short', day:'numeric'});
        exCon.insertAdjacentHTML('beforeend', \`
            <div class="extreme-card">
                <i data-lucide="\${isHigh ? 'trending-up' : 'trending-down'}" width="22" class="ex-icon \${isHigh ? 'high' : 'low'}"></i>
                <div class="ex-details">
                    <h4>\${isHigh ? 'HIGH' : 'LOW'} · \${d}</h4>
                    <div class="extime">\${t}</div>
                    <div class="exlevel">\${(+ex.level).toFixed(2)} \${units === 'meters' ? 'm' : 'ft'}</div>
                </div>
            </div>
        \`);
    });
    lucide.createIcons();

    // Chart
    buildChart(tl.timeline || [], ext.extremes || [], units);
}

function buildChart(timeline, extremes, units) {
    const ctx = $('tideChart').getContext('2d');
    if (tideChart) tideChart.destroy();

    const lineData = timeline.map(t => ({
        x: new Date(t.time),
        y: typeof t.level === 'number' ? t.level : (t.corrected ?? t.astronomical ?? 0)
    }));
    const scatterData = extremes.map(e => ({ x: new Date(e.time), y: e.level }));

    const grad = ctx.createLinearGradient(0, 0, 0, 360);
    grad.addColorStop(0, 'rgba(0,242,254,0.35)');
    grad.addColorStop(1, 'rgba(79,172,254,0.0)');

    tideChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Water Level',
                    data: lineData,
                    borderColor: '#00f2fe',
                    backgroundColor: grad,
                    borderWidth: 2, fill: true,
                    pointRadius: 0, pointHitRadius: 12, tension: 0.4
                },
                {
                    label: 'Extremes', data: scatterData, type: 'scatter',
                    backgroundColor: '#fff', borderColor: '#4facfe',
                    borderWidth: 2, pointRadius: 5, pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17,26,44,0.92)',
                    titleFont: { family: 'Outfit', size: 13 },
                    bodyFont: { family: 'Inter', size: 12 },
                    padding: 12, cornerRadius: 8,
                    callbacks: {
                        title: ctx => new Date(ctx[0].raw.x).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
                        label: ctx => ' ' + (+ctx.parsed.y).toFixed(2) + (units === 'meters' ? ' m' : ' ft')
                    }
                }
            },
            scales: {
                x: {
                    type: 'time', time: { unit: 'hour', displayFormats: { hour: 'ha' } },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
                }
            }
        }
    });
}

// ─── Init ───────────────────────────────────────────────
loadIndianStations();
setTimeout(fetchData, 400);
</script>
</body>
</html>
`;
