import { elements } from './data.js';

const tableContainer = document.getElementById('periodic-table');
const infoPanel = document.getElementById('info-panel');
const elName = document.getElementById('element-name');
const elSymbol = document.getElementById('element-symbol');
const elNumber = document.getElementById('element-number');
const elAbundance = document.getElementById('element-abundance');

// Find max abundance for scaling (logarithmic scale is usually better for this data)
// Oxygen is ~461,000, while some are < 0.001. Log scale is essential.
const maxAbundance = Math.max(...elements.map(e => e.abundance));
const minAbundance = Math.min(...elements.filter(e => e.abundance > 0).map(e => e.abundance));

// Logarithmic normalization
function getHeatmapColor(abundance) {
    if (abundance <= 0) return { color: 'rgba(255, 255, 255, 0.05)', glow: 'none', shadow: 'none' };

    // Log scale: log(x) - log(min) / log(max) - log(min)
    const logVal = Math.log10(abundance);
    const logMin = Math.log10(minAbundance);
    const logMax = Math.log10(maxAbundance);

    let normalized = (logVal - logMin) / (logMax - logMin);
    normalized = Math.max(0, Math.min(1, normalized)); // Clamp between 0 and 1

    // Color interpolation from dark blue/grey to bright cyan/white
    // Low: #1e293b (Background) -> High: #06b6d4 (Cyan) -> #ffffff (White)

    // We'll use HSL for easier control.
    // Hue: 220 (Blue) -> 180 (Cyan) -> 60 (Yellow/White-ish)
    // Lightness: 10% -> 50% -> 100%
    // Alpha: 0.2 -> 1

    let h, s, l, a;

    if (normalized < 0.5) {
        // First half: Blue to Cyan
        const t = normalized * 2; // 0 to 1
        h = 220 - (40 * t); // 220 -> 180
        s = 30 + (70 * t);  // 30% -> 100%
        l = 20 + (30 * t);  // 20% -> 50%
        a = 0.3 + (0.7 * t);
    } else {
        // Second half: Cyan to White/Gold
        const t = (normalized - 0.5) * 2; // 0 to 1
        h = 180 - (140 * t); // 180 -> 40 (Goldish)
        s = 100;
        l = 50 + (50 * t);   // 50% -> 100%
        a = 1;
    }

    const color = `hsla(${h}, ${s}%, ${l}%, ${a})`;

    // Glow effect for high abundance
    let glow = 'none';
    let shadow = 'none';
    if (normalized > 0.6) {
        const blur = (normalized - 0.6) * 25; // 0 to 10px
        glow = `0 0 ${blur}px ${color}`;
        shadow = `0 0 ${blur * 1.5}px ${color}`;
    }

    return { color, glow, shadow, normalized };
}

function renderTable() {
    elements.forEach(element => {
        const elDiv = document.createElement('div');
        elDiv.classList.add('element');

        // Grid positioning
        elDiv.style.gridColumn = element.col;
        elDiv.style.gridRow = element.row;

        // Content
        elDiv.innerHTML = `
      <span class="number">${element.number}</span>
      <span class="symbol">${element.symbol}</span>
    `;

        // Heatmap styling
        const style = getHeatmapColor(element.abundance);

        // We apply the color to the background or border or text?
        // Let's make the background shine.
        elDiv.style.backgroundColor = style.color;
        elDiv.style.boxShadow = style.shadow;
        elDiv.style.borderColor = `rgba(255,255,255, ${style.normalized * 0.5 + 0.1})`;

        // Text color adjustment for readability
        if (style.normalized > 0.7) {
            elDiv.style.color = '#000';
        } else {
            elDiv.style.color = '#fff';
        }

        // Hover events
        elDiv.addEventListener('mouseenter', () => showInfo(element));
        elDiv.addEventListener('mouseleave', () => hideInfo());

        tableContainer.appendChild(elDiv);
    });
}

function showInfo(element) {
    elName.textContent = element.name;
    elSymbol.textContent = element.symbol;
    elNumber.textContent = element.number;
    elAbundance.textContent = element.abundance.toLocaleString(); // Format number

    infoPanel.classList.remove('hidden');
}

function hideInfo() {
    infoPanel.classList.add('hidden');
}

renderTable();
