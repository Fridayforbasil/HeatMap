import { elements } from './data.js';
import { isotopeData } from './isotopes.js';

const tableContainer = document.getElementById('periodic-table');
const infoPanel = document.getElementById('info-panel');
const elName = document.getElementById('element-name');
const elSymbol = document.getElementById('element-symbol');
const elNumber = document.getElementById('element-number');
const elAbundance = document.getElementById('element-abundance');

// Modal Elements
const modal = document.getElementById('isotope-modal');
const closeButton = document.querySelector('.close-button');
const modalElementName = document.getElementById('modal-element-name');
const isotopeList = document.getElementById('isotope-list');

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

        // Click event for modal
        elDiv.addEventListener('click', () => openModal(element));

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

// Modal Logic
function openModal(element) {
    modalElementName.textContent = `${element.name} Isotopes`;
    isotopeList.innerHTML = ''; // Clear previous

    const elementIsotopes = isotopeData.find(d => d.atomic_number === element.number);

    if (elementIsotopes && elementIsotopes.isotopes) {
        renderIsotopes(elementIsotopes.isotopes);
    } else {
        isotopeList.innerHTML = '<p>No isotope data available.</p>';
    }

    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
}

closeButton.addEventListener('click', closeModal);
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

function renderIsotopes(isotopes) {
    // Filter out isotopes with 0 abundance if desired, or keep them to show synthetic ones.
    // Let's keep them but style them differently.

    // Find max abundance for this element to normalize heatmap
    const maxIsoAbundance = Math.max(...isotopes.map(i => i.abundance));

    isotopes.forEach(iso => {
        const card = document.createElement('div');
        card.classList.add('isotope-card');

        // Heatmap color for isotope
        let bgStyle = 'rgba(255, 255, 255, 0.05)';
        let textColor = '#fff';

        if (iso.abundance > 0) {
            // Log scale for isotopes too? Usually one or two dominate.
            // Linear might be better here to show dominance, or log to show trace.
            // Let's stick to the main table's logic: Logarithmic if range is huge.
            // But for isotopes, usually it's 99% vs 1% vs 0.001%.
            // Let's use a simple linear opacity or lightness for now, or reuse the getHeatmapColor logic but adapted.

            // Simple approach: Opacity of a base color based on abundance
            // Abundance is percentage (0-100) or fraction (0-1)? 
            // Checking data... it seems to be fraction or percentage. 
            // In the JSON snippet: H-1 is 0.999885 (fraction).

            const percentage = iso.abundance * 100;
            const alpha = 0.2 + (0.8 * (iso.abundance)); // 0.2 min opacity

            // Color: Cyan for high abundance, Dark for low
            bgStyle = `rgba(6, 182, 212, ${alpha})`;

            if (iso.abundance > 0.5) {
                textColor = '#000'; // Dark text on bright background
            }
        }

        card.style.backgroundColor = bgStyle;
        card.style.color = textColor;

        card.innerHTML = `
            <div class="isotope-nuclide">${iso.nuclide}</div>
            <div class="isotope-mass">${iso.mass.toFixed(4)} u</div>
            <div class="isotope-abundance">${(iso.abundance * 100).toFixed(4)}%</div>
        `;

        isotopeList.appendChild(card);
    });
}

renderTable();
