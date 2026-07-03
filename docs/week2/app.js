// -------------------------------------------------------------
// Pyodide (WASM Python) Initialization and Console Controller
// -------------------------------------------------------------
let pyodideInstance = null;
let currentOutputBuffer = "";

// Helper to support Tab key indentation in textareas
function enableTabIndentation(textarea) {
    textarea.addEventListener("keydown", function (e) {
        if (e.key === "Tab") {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
        }
    });
}

// Initialize Pyodide
async function initPyodide() {
    const statusText = document.getElementById("status-text");
    const statusDot = document.getElementById("status-dot");
    const globalConsoleTerminal = document.getElementById("global-console-terminal");

    try {
        pyodideInstance = await loadPyodide({
            stdout: (text) => {
                currentOutputBuffer += text + "\n";
            },
            stderr: (text) => {
                currentOutputBuffer += "Error: " + text + "\n";
            }
        });

        statusText.textContent = "Python Ready (WASM)";
        statusDot.className = "status-dot ready";
        globalConsoleTerminal.textContent = ">>> Python Environment Initialized.\n>>> Type code above and click Execute.";

        // Warm up Pyodide with an execution
        await pyodideInstance.runPythonAsync("print('Pyodide engine is active.')");
        currentOutputBuffer = ""; // Reset warm-up logs
    } catch (err) {
        statusText.textContent = "Load Failed";
        statusDot.className = "status-dot";
        globalConsoleTerminal.textContent = "Failed to load Python: " + err;
        console.error("Pyodide loading error:", err);
    }
}

// Redirect and capture execution outputs
async function runPythonCode(code) {
    if (!pyodideInstance) {
        return "Python environment is still loading. Please wait...";
    }
    currentOutputBuffer = "";
    try {
        const result = await pyodideInstance.runPythonAsync(code);
        if (currentOutputBuffer.trim() === "") {
            if (result !== undefined && result !== null && String(result) !== "None") {
                return String(result);
            }
            return "";
        }
        return currentOutputBuffer;
    } catch (err) {
        return "Traceback (most recent call last):\n" + String(err);
    }
}

// -------------------------------------------------------------
// Navigation and Layout Control
// -------------------------------------------------------------
function navigateToSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll(".content-section");
    sections.forEach(sec => sec.classList.remove("active"));

    // Show targeted section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add("active");
        document.querySelector(".content-body").scrollTop = 0;
    }

    // Toggle active state in sidebar menu
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        if (item.getAttribute("data-target") === sectionId) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Update Header breadcrumb
    const headerTitle = document.getElementById("current-section-title");
    const navItem = document.querySelector(`.nav-item[data-target="${sectionId}"]`);
    if (navItem) {
        headerTitle.textContent = navItem.innerText.trim();
    }

    // Graph plotting sync trigger
    if (sectionId === "complexity-section") {
        const slider = document.getElementById("n-slider");
        if (slider) updateBigOGraph(parseInt(slider.value));
    }

    // Trigger input event to recalculate live code highlights and heights once section is visible
    if (targetSection) {
        targetSection.querySelectorAll('.live-code-textarea').forEach(ta => {
            ta.dispatchEvent(new Event('input'));
        });
    }
}

// Dynamic Section Navigation Footers (Next / Previous Buttons)
function setupSectionNavigation() {
    const navItems = Array.from(document.querySelectorAll(".sidebar-nav .nav-item"));
    if (navItems.length === 0) return;

    navItems.forEach((item, index) => {
        const targetId = item.getAttribute("data-target");
        const section = document.getElementById(targetId);
        if (!section) return;

        if (section.querySelector(".section-nav-footer")) return;

        const footer = document.createElement("div");
        footer.className = "section-nav-footer";

        // Previous button
        if (index > 0) {
            const prevItem = navItems[index - 1];
            const prevTarget = prevItem.getAttribute("data-target");
            const prevTitle = prevItem.innerText.trim();

            const prevBtn = document.createElement("button");
            prevBtn.className = "sec-nav-btn prev-btn";
            prevBtn.innerHTML = `
                <span class="nav-label"><i class="fa-solid fa-arrow-left"></i> Previous Section</span>
                <span class="nav-title">${prevTitle}</span>
            `;
            prevBtn.addEventListener("click", () => {
                navigateToSection(prevTarget);
            });
            footer.appendChild(prevBtn);
        } else {
            const placeholder = document.createElement("div");
            placeholder.style.flex = "1";
            footer.appendChild(placeholder);
        }

        // Next button
        if (index < navItems.length - 1) {
            const nextItem = navItems[index + 1];
            const nextTarget = nextItem.getAttribute("data-target");
            const nextTitle = nextItem.innerText.trim();

            const nextBtn = document.createElement("button");
            nextBtn.className = "sec-nav-btn next-btn";
            nextBtn.innerHTML = `
                <span class="nav-label">Next Section <i class="fa-solid fa-arrow-right"></i></span>
                <span class="nav-title">${nextTitle}</span>
            `;
            nextBtn.addEventListener("click", () => {
                navigateToSection(nextTarget);
            });
            footer.appendChild(nextBtn);
        } else {
            const placeholder = document.createElement("div");
            placeholder.style.flex = "1";
            footer.appendChild(placeholder);
        }

        section.appendChild(footer);
    });
}

// -------------------------------------------------------------
// Interactive Components Init
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    // Sidebar toggle trigger
    const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
    const appContainer = document.querySelector(".app-container");

    if (sidebarToggleBtn && appContainer) {
        sidebarToggleBtn.addEventListener("click", () => {
            appContainer.classList.toggle("collapsed");
        });
    }

    // Theme toggle trigger
    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            document.body.classList.toggle("light-mode");
            const icon = themeToggleBtn.querySelector("i");
            if (icon) {
                icon.className = document.body.classList.contains("light-mode") ? "fa-solid fa-moon" : "fa-solid fa-sun";
            }
        });
    }

    // Nav menu items
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const target = item.getAttribute("data-target");
            navigateToSection(target);
        });
    });

    // Global Console drawer trigger
    const toggleConsoleBtn = document.getElementById("toggle-console-btn");
    const clearConsoleBtn = document.getElementById("clear-console-btn");
    const minimizeConsoleBtn = document.getElementById("minimize-console-btn");
    const runConsoleBtn = document.getElementById("run-global-console-btn");
    const consoleDrawer = document.getElementById("console-drawer");

    const toggleDrawer = () => {
        consoleDrawer.classList.toggle("expanded");
    };

    if (toggleConsoleBtn) toggleConsoleBtn.addEventListener("click", toggleDrawer);
    if (minimizeConsoleBtn) minimizeConsoleBtn.addEventListener("click", toggleDrawer);

    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener("click", () => {
            document.getElementById("global-console-terminal").textContent = "Console cleared.\n";
        });
    }

    if (runConsoleBtn) {
        runConsoleBtn.addEventListener("click", async () => {
            const consoleTextarea = document.getElementById("global-console-textarea");
            const consoleTerminal = document.getElementById("global-console-terminal");
            consoleTerminal.textContent = "Running...\n";
            const result = await runPythonCode(consoleTextarea.value);
            consoleTerminal.textContent = result || ">>> Code executed with no printed output.";
        });
    }

    // Initialize all custom guides components
    initPyodide();
    setupBigOGraphVisualizer();
    setupIndexingVisualizer();
    setupDynamicArrayVisualizer();
    setupOOPVisualizer();
    setupSectionNavigation();
    loadQuizQuestion();
    initLiveEditorHighlighting();

    // Setup run button for embedded code sandboxes
    document.querySelectorAll(".run-editor-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const container = btn.closest(".embedded-editor-container");
            const textarea = container.querySelector(".editor-textarea");
            const outputField = container.querySelector(".editor-output");

            outputField.textContent = "Running code snippet...\n";
            if (!pyodideInstance) {
                outputField.textContent = "Python engine is loading. Please wait...";
                return;
            }

            const result = await runPythonCode(textarea.value);
            outputField.textContent = result || ">>> Code executed with no printed output.";
        });
    });

    // Enable tab indentation
    document.querySelectorAll("textarea").forEach(textarea => {
        enableTabIndentation(textarea);
    });
});

// -------------------------------------------------------------
// Module 1: Big-O Curves SVG Graph
// -------------------------------------------------------------
const activeCurves = {
    constant: true,
    logarithmic: true,
    linear: true,
    linearithmic: true,
    quadratic: true,
    exponential: true
};

function setupBigOGraphVisualizer() {
    const slider = document.getElementById("n-slider");
    const nVal = document.getElementById("n-val");

    if (slider) {
        slider.addEventListener("input", (e) => {
            const val = parseInt(e.target.value);
            nVal.textContent = val;
            updateBigOGraph(val);
        });
        updateBigOGraph(parseInt(slider.value));
    }

    // Toggle curve on row click
    const rows = document.querySelectorAll(".curve-toggle-row");
    rows.forEach(row => {
        row.style.cursor = "pointer";
        row.style.transition = "all 0.2s ease";
        row.addEventListener("click", () => {
            const curve = row.getAttribute("data-curve");
            activeCurves[curve] = !activeCurves[curve];

            if (activeCurves[curve]) {
                row.style.opacity = "1";
                row.style.transform = "none";
                row.style.borderColor = "var(--border-color)";
                row.style.background = "var(--bg-primary)";
            } else {
                row.style.opacity = "0.4";
                row.style.transform = "scale(0.98)";
                row.style.borderColor = "transparent";
                row.style.background = "rgba(0,0,0,0.02)";
            }
            updateBigOGraph(parseInt(slider.value));
        });
    });
}

function updateBigOGraph(n) {
    const svg = document.getElementById("bigo-svg");
    if (!svg) return;

    // Clear previous elements
    svg.innerHTML = "";

    // Boundaries
    const w = 400;
    const h = 250;
    const paddingX = 40;
    const paddingY = 20;

    // Map formulas
    const xOfN = (val) => paddingX + (val - 1) * (w - paddingX - 10) / 49;
    const yOfVal = (val) => {
        const heightBound = h - paddingY - 20;
        const normalized = Math.max(0, Math.min(200, val));
        return (h - paddingY) - (normalized * heightBound / 200);
    };

    // Y values calculations
    const log2 = Math.log2(n);
    const constantVal = 10;
    const logarithmicVal = 15 * log2;
    const linearVal = 3.5 * n;
    const linearithmicVal = 0.8 * n * log2;
    const quadraticVal = 0.08 * n * n;
    const exponentialVal = 0.1 * Math.pow(2, n);

    // Write labels dynamically based on toggles
    document.getElementById("val-constant").textContent = activeCurves.constant ? "10 Operations" : "--";
    document.getElementById("val-logarithmic").textContent = activeCurves.logarithmic ? `${Math.round(logarithmicVal)} Operations` : "--";
    document.getElementById("val-linear").textContent = activeCurves.linear ? `${Math.round(linearVal)} Operations` : "--";
    document.getElementById("val-linearithmic").textContent = activeCurves.linearithmic ? `${Math.round(linearithmicVal)} Operations` : "--";
    document.getElementById("val-quadratic").textContent = activeCurves.quadratic ? `${Math.round(quadraticVal)} Operations` : "--";
    document.getElementById("val-exponential").textContent = activeCurves.exponential ? (exponentialVal > 1000000 ? "∞ (too high)" : `${Math.round(exponentialVal)} Operations`) : "--";

    // Draw grid axes
    svg.innerHTML += `<line x1="${paddingX}" y1="${h - paddingY}" x2="${w}" y2="${h - paddingY}" stroke="var(--border-color)" stroke-width="2" />`;
    svg.innerHTML += `<line x1="${paddingX}" y1="${paddingY}" x2="${paddingX}" y2="${h - paddingY}" stroke="var(--border-color)" stroke-width="2" />`;
    
    // Axes titles
    svg.innerHTML += `<text x="${w - 10}" y="${h - 5}" font-size="9" fill="var(--text-muted)" text-anchor="end">Input size (n)</text>`;
    svg.innerHTML += `<text x="5" y="${paddingY - 5}" font-size="9" fill="var(--text-muted)" transform="rotate(-90 5 ${paddingY - 5})" text-anchor="end">Operations</text>`;

    // Generate paths for functions
    const points = {
        constant: [],
        logarithmic: [],
        linear: [],
        linearithmic: [],
        quadratic: [],
        exponential: []
    };

    for (let x = 1; x <= 50; x++) {
        const lx2 = Math.log2(x);
        points.constant.push({x: xOfN(x), y: yOfVal(10)});
        points.logarithmic.push({x: xOfN(x), y: yOfVal(15 * lx2)});
        points.linear.push({x: xOfN(x), y: yOfVal(3.5 * x)});
        points.linearithmic.push({x: xOfN(x), y: yOfVal(0.8 * x * lx2)});
        points.quadratic.push({x: xOfN(x), y: yOfVal(0.08 * x * x)});
        points.exponential.push({x: xOfN(x), y: yOfVal(0.1 * Math.pow(2, x))});
    }

    const drawPath = (ptList, color) => {
        let d = `M ${ptList[0].x} ${ptList[0].y} `;
        for (let i = 1; i < ptList.length; i++) {
            d += `L ${ptList[i].x} ${ptList[i].y} `;
        }
        svg.innerHTML += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" />`;
    };

    // Draw curves if they are active
    if (activeCurves.constant) drawPath(points.constant, "#64748b");
    if (activeCurves.logarithmic) drawPath(points.logarithmic, "#10b981");
    if (activeCurves.linear) drawPath(points.linear, "#06b6d4");
    if (activeCurves.linearithmic) drawPath(points.linearithmic, "#8b5cf6");
    if (activeCurves.quadratic) drawPath(points.quadratic, "#f97316");
    if (activeCurves.exponential) drawPath(points.exponential, "#ef4444");

    // Draw vertical intersection marker
    const currentX = xOfN(n);
    svg.innerHTML += `<line x1="${currentX}" y1="${paddingY}" x2="${currentX}" y2="${h - paddingY}" stroke="var(--accent-blue)" stroke-width="1.5" stroke-dasharray="4 3" />`;

    // Draw dots at intersection points if they are active
    const drawDot = (yVal, color) => {
        const py = yOfVal(yVal);
        if (py >= paddingY && py <= h - paddingY) {
            svg.innerHTML += `<circle cx="${currentX}" cy="${py}" r="4" fill="${color}" stroke="var(--bg-card)" stroke-width="1.5" />`;
        }
    };

    if (activeCurves.constant) drawDot(10, "#64748b");
    if (activeCurves.logarithmic) drawDot(15 * log2, "#10b981");
    if (activeCurves.linear) drawDot(3.5 * n, "#06b6d4");
    if (activeCurves.linearithmic) drawDot(0.8 * n * log2, "#8b5cf6");
    if (activeCurves.quadratic) drawDot(0.08 * n * n, "#f97316");
    if (activeCurves.exponential) drawDot(0.1 * Math.pow(2, n), "#ef4444");
}

// -------------------------------------------------------------
// Module 2: List Indexing Memory Simulator
// -------------------------------------------------------------
function setupIndexingVisualizer() {
    const container = document.querySelector(".memory-grid-container");
    const btnContainer = document.getElementById("idx-btn-container");
    const sliderVal = document.getElementById("idx-slider-val");
    const btnTrace = document.getElementById("btn-trace-lookup");
    const stepTitle = document.getElementById("calc-step-title");
    const stepDesc = document.getElementById("calc-step-desc");

    if (!container || !btnContainer || !sliderVal || !btnTrace) return;

    const values = ["BMW", "Audi", "Porsche", "Ferrari", "Tesla", "Bentley", "Aston", "Lambo"];
    const heapAddresses = ["0x7FA0", "0x8B1C", "0x9E08", "0xA6D2", "0xB50F", "0xC834", "0xD2A8", "0xE9F0"];
    
    let currentIdx = 3;

    // Render selector buttons
    btnContainer.innerHTML = "";
    for (let i = 0; i < 8; i++) {
        const btn = document.createElement("button");
        btn.className = "btn btn-secondary";
        btn.textContent = i;
        btn.style.cssText = `
            padding: 4px 10px;
            font-size: 11.5px;
            font-family: 'Fira Code', monospace;
            border-radius: 4px;
            font-weight: 700;
            min-width: 32px;
            border: 1px solid var(--border-color);
            background: rgba(255,255,255,0.02);
            transition: all var(--transition-fast);
            color: var(--text-secondary);
            cursor: pointer;
        `;
        btn.addEventListener("click", () => {
            currentIdx = i;
            sliderVal.textContent = i;
            updateSelectorButtons();
            triggerTrace(i);
        });
        btnContainer.appendChild(btn);
    }

    function updateSelectorButtons() {
        const buttons = btnContainer.querySelectorAll("button");
        buttons.forEach((btn, i) => {
            if (i === currentIdx) {
                btn.style.background = "var(--accent-blue)";
                btn.style.borderColor = "var(--accent-blue)";
                btn.style.color = "#ffffff";
                btn.style.boxShadow = "0 0 8px rgba(59, 130, 246, 0.4)";
            } else {
                btn.style.background = "rgba(255, 255, 255, 0.02)";
                btn.style.borderColor = "var(--border-color)";
                btn.style.color = "var(--text-secondary)";
                btn.style.boxShadow = "none";
            }
        });
    }

    updateSelectorButtons();    function renderGrid() {
        container.innerHTML = `
            <div style="max-width: 720px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 15px;">
                <!-- Row 1: Python List (Array of Reference Pointers) -->
                <div>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--accent-blue); font-weight: 700; margin-bottom: 8px; display: flex; justify-content: space-between;">
                        <span>Python List (Reference Array)</span>
                        <span style="font-family: monospace; font-size: 10px; color: var(--text-muted);">Base Address: 0x1000</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px;" id="list-ref-row">
                        ${values.map((_, idx) => `
                            <div class="ref-cell" id="ref-cell-${idx}">
                                <span style="font-size: 9px; color: var(--text-muted); font-weight:700;">[${idx}]</span>
                                <span style="font-family: 'Fira Code', monospace; font-size: 10.5px; color: var(--accent-cyan); margin-top: 3px; font-weight: 600;">${heapAddresses[idx]}</span>
                                <span style="font-family: 'Fira Code', monospace; font-size: 8px; color: var(--text-muted); margin-top: 3px;">0x${(0x1000 + idx * 8).toString(16).toUpperCase()}</span>
                            </div>
                        `).join("")}
                    </div>
                </div>

                <!-- Row 2: Downward Connectors -->
                <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; height: 16px; text-align: center;">
                    ${values.map((_, idx) => `
                        <div class="pointer-arrow" id="pointer-arrow-${idx}">
                            <i class="fa-solid fa-arrow-down"></i>
                        </div>
                    `).join("")}
                </div>

                <!-- Row 3: Heap Storage (Actual Objects) -->
                <div>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--accent-green); font-weight: 700; margin-bottom: 8px;">
                        Heap Memory (Actual Objects)
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px;" id="heap-obj-row">
                        ${values.map((val, idx) => `
                            <div class="heap-cell" id="heap-cell-${idx}">
                                <span style="font-family: 'Fira Code', monospace; font-size: 8.5px; color: var(--text-muted); margin-bottom: 3px;">${heapAddresses[idx]}</span>
                                <strong style="font-size: 12px; color: var(--text-primary); font-family: 'Outfit', sans-serif;">"${val}"</strong>
                                <span style="font-size: 7.5px; color: var(--accent-green); margin-top: 3px; font-weight: 700; text-transform: uppercase; opacity: 0; transition: opacity 0.3s ease;">LOADED</span>
                            </div>
                        `).join("")}
                    </div>
                </div>
            </div>
        `;
    }

    renderGrid();

    // Re-bind click event to cells directly
    values.forEach((_, idx) => {
        const refCell = container.querySelector(`#ref-cell-${idx}`);
        if (refCell) {
            refCell.addEventListener("click", () => {
                currentIdx = idx;
                sliderVal.textContent = idx;
                updateSelectorButtons();
                triggerTrace(idx);
            });
        }
    });

    btnTrace.addEventListener("click", () => {
        triggerTrace(currentIdx, true);
    });

    let traceTimeout1 = null;
    let traceTimeout2 = null;
    let traceTimeout3 = null;

    function triggerTrace(idx, animate = false) {
        clearTimeout(traceTimeout1);
        clearTimeout(traceTimeout2);
        clearTimeout(traceTimeout3);

        container.querySelectorAll(".ref-cell").forEach(cell => {
            cell.className = "ref-cell";
        });
        container.querySelectorAll(".heap-cell").forEach(cell => {
            cell.className = "heap-cell";
            cell.querySelector("span:last-child").style.opacity = "0";
        });
        for (let i = 0; i < 8; i++) {
            const arrow = container.querySelector(`#pointer-arrow-${i}`);
            if (arrow) {
                arrow.className = "pointer-arrow";
            }
        }

        const addressHex = "0x" + (0x1000 + idx * 8).toString(16).toUpperCase();
        const refAddr = heapAddresses[idx];
        const valName = values[idx];

        if (!animate) {
            const refCell = container.querySelector(`#ref-cell-${idx}`);
            const heapCell = container.querySelector(`#heap-cell-${idx}`);
            const arrow = container.querySelector(`#pointer-arrow-${idx}`);

            if (refCell) {
                refCell.classList.add("active");
            }
            if (arrow) {
                arrow.classList.add("active");
            }
            if (heapCell) {
                heapCell.classList.add("active");
                heapCell.querySelector("span:last-child").style.opacity = "1";
            }

            stepTitle.innerHTML = `<i class="fa-solid fa-calculator" style="color:var(--accent-blue); margin-right:6px;"></i> Lookup Results for Index [${idx}]`;
            stepDesc.innerHTML = `
                Target Address = <strong>0x1000 + (${idx} × 8) = ${addressHex}</strong><br>
                1. Read reference pointer stored at index cell address <code>${addressHex}</code>: <code>${refAddr}</code>.<br>
                2. Direct memory jump to heap address <code>${refAddr}</code>. Read object string <strong>"${valName}"</strong>.<br>
                <span style="color:var(--accent-green); font-weight:700;">Instantly retrieved in a single O(1) mathematical step!</span>
            `;
        } else {
            stepTitle.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color:var(--accent-blue); margin-right:6px;"></i> Step 1: Compute Offset`;
            stepDesc.innerHTML = `
                Array base starts at address <code>0x1000</code>.<br>
                Multiply index by width of memory reference (8 bytes):<br>
                Offset = <strong>${idx} × 8 = ${idx * 8} bytes</strong>.
            `;

            const activeRef = container.querySelector(`#ref-cell-${idx}`);
            if (activeRef) {
                activeRef.classList.add("searching");
            }

            traceTimeout1 = setTimeout(() => {
                stepTitle.innerHTML = `<i class="fa-solid fa-location-crosshairs" style="color:var(--accent-cyan); margin-right:6px;"></i> Step 2: Access Reference Cell`;
                stepDesc.innerHTML = `
                    Compute physical address: <strong>0x1000 + ${idx * 8} = ${addressHex}</strong>.<br>
                    Load 64-bit reference pointer stored inside: <strong><code>${refAddr}</code></strong>.
                `;
                if (activeRef) {
                    activeRef.classList.remove("searching");
                    activeRef.classList.add("active");
                }
                const arrow = container.querySelector(`#pointer-arrow-${idx}`);
                if (arrow) {
                    arrow.classList.add("active");
                }

                traceTimeout2 = setTimeout(() => {
                    stepTitle.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--accent-green); margin-right:6px;"></i> Step 3: Dereference Heap Object`;
                    stepDesc.innerHTML = `
                        Jump directly to heap address <strong><code>${refAddr}</code></strong>.<br>
                        Read value stored at that location: <strong style="color:var(--accent-green); font-size:13.5px;">"${valName}"</strong>.<br>
                        <strong>Done!</strong> Constant O(1) time - no elements scanned!
                    `;
                    const activeHeap = container.querySelector(`#heap-cell-${idx}`);
                    if (activeHeap) {
                        activeHeap.classList.add("active");
                        activeHeap.querySelector("span:last-child").style.opacity = "1";
                    }
                }, 1200);

            }, 1000);
        }
    }

    triggerTrace(3);
}

// -------------------------------------------------------------
// Module 3: Dynamic Array Simulator
// -------------------------------------------------------------
let simSize = 0;
let simCapacity = 1;
let simData = [null];
let resizeCount = 0;
let totalCopies = 0;

function setupDynamicArrayVisualizer() {
    const appendBtn = document.getElementById("sim-append-btn");
    const resetBtn = document.getElementById("sim-reset-btn");

    if (appendBtn) appendBtn.addEventListener("click", appendSimElement);
    if (resetBtn) resetBtn.addEventListener("click", resetSimArray);

    renderSimArray();
}

function renderSimArray() {
    const row = document.getElementById("array-slots-row");
    if (!row) return;

    row.innerHTML = "";
    document.getElementById("arr-size-lbl").textContent = simSize;
    document.getElementById("arr-cap-lbl").textContent = simCapacity;
    document.getElementById("arr-resizes-lbl").textContent = resizeCount;
    document.getElementById("arr-copies-lbl").textContent = totalCopies;

    // Update progress bar & label
    const pct = Math.round((simSize / simCapacity) * 100);
    const progress = document.getElementById("capacity-progress");
    const utilLbl = document.getElementById("util-percentage-lbl");
    if (progress) progress.style.width = `${pct}%`;
    if (utilLbl) utilLbl.textContent = `${pct}% Used (${simSize}/${simCapacity} slots)`;

    for (let i = 0; i < simCapacity; i++) {
        const slot = document.createElement("div");
        const val = simData[i];
        slot.style.cssText = `
            width: 42px;
            height: 42px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 6px;
            font-size: 13.5px;
            font-weight: 700;
            transition: all 0.3s ease;
        `;

        if (i < simSize) {
            slot.style.background = "rgba(59, 130, 246, 0.15)";
            slot.style.border = "1.5px solid var(--accent-blue)";
            slot.style.color = "var(--accent-blue)";
            slot.textContent = val;
        } else {
            slot.style.background = "rgba(255, 255, 255, 0.02)";
            slot.style.border = "1px dashed var(--border-color)";
            slot.style.color = "var(--text-muted)";
            slot.textContent = "-";
        }

        row.appendChild(slot);
    }
}

function appendSimElement() {
    const strategy = document.getElementById("resize-strategy").value;
    const log = document.getElementById("resize-activity-log");
    const appendBtn = document.getElementById("sim-append-btn");
    const randomVal = Math.floor(Math.random() * 90) + 10;

    // Check if next append exceeds cap of 32 elements
    if (simSize >= 32) {
        if (log) {
            log.style.color = "var(--accent-red)";
            log.innerHTML = `
                <strong><i class="fa-solid fa-ban"></i> Max Limit Reached (32 Slots)!</strong><br>
                For visualization clarity, this simulator is capped at 32 slots. Please reset the simulator to try again.
            `;
        }
        if (appendBtn) appendBtn.disabled = true;
        return;
    }

    let resizeTriggered = false;
    let copies = 0;
    let oldCapacity = simCapacity;

    if (simSize === simCapacity) {
        resizeTriggered = true;
        resizeCount++;
        copies = simSize;
        totalCopies += copies;

        // Doubling vs Fixed strategies
        if (strategy === "double") {
            simCapacity *= 2;
        } else {
            simCapacity += 4;
        }

        // Expand backing array elements
        const newData = new Array(simCapacity).fill(null);
        for (let i = 0; i < simSize; i++) {
            newData[i] = simData[i];
        }
        simData = newData;

        // Visual flash effect on resize re-allocation
        const slotsRow = document.getElementById("array-slots-row");
        if (slotsRow) {
            slotsRow.style.transform = "scale(1.03)";
            slotsRow.style.borderColor = "var(--accent-orange)";
            slotsRow.style.boxShadow = "0 0 15px rgba(249, 115, 22, 0.4)";
            setTimeout(() => {
                slotsRow.style.transform = "none";
                slotsRow.style.borderColor = "var(--border-color)";
                slotsRow.style.boxShadow = "none";
            }, 500);
        }
    }

    // Insert element
    simData[simSize] = randomVal;
    simSize++;

    renderSimArray();

    // Visual Log Feedback
    if (resizeTriggered) {
        log.style.color = "var(--accent-orange)";
        log.innerHTML = `
            <strong><i class="fa-solid fa-triangle-exclamation"></i> Array is FULL! Resizing Triggered (O(n) work):</strong><br>
            1. Allocated new contiguous memory array of capacity <strong>${simCapacity}</strong>.<br>
            2. Copied <strong>${copies}</strong> elements to new slots (takes ${copies} operations).<br>
            3. Appended <strong>${randomVal}</strong> at index ${simSize - 1}.
        `;
    } else {
        log.style.color = "var(--text-secondary)";
        log.innerHTML = `
            <strong><i class="fa-solid fa-circle-check" style="color:var(--accent-green);"></i> Append Successful (O(1) work):</strong><br>
            Appended element <strong>${randomVal}</strong> directly into empty slot at index ${simSize - 1}. No resizing needed!
        `;
    }

    // Auto-disable if we just reached the 32 slot limit
    if (simSize >= 32 && appendBtn) {
        appendBtn.disabled = true;
    }
}

function resetSimArray() {
    simSize = 0;
    simCapacity = 1;
    simData = [null];
    resizeCount = 0;
    totalCopies = 0;

    const appendBtn = document.getElementById("sim-append-btn");
    if (appendBtn) appendBtn.disabled = false;

    const log = document.getElementById("resize-activity-log");
    if (log) {
        log.style.color = "var(--text-secondary)";
        log.innerHTML = "Simulator reset. Click 'Append Element' to start.";
    }

    renderSimArray();
}



// -------------------------------------------------------------
// Module 5: Interactive Quiz Control
// -------------------------------------------------------------
const quizQuestions = [
    {
        qnum: "Question 1 of 5",
        question: "Which complexity growth function scales slowest for large values of input n?",
        options: [
            "Quadratic O(n²)",
            "Linearithmic O(n log n)",
            "Logarithmic O(log n)",
            "Exponential O(2ⁿ)"
        ],
        correct: 2,
        explanation: "Logarithmic O(log n) is by far the slowest scaling function here. As input n increases, the logarithmic operations grow extremely slowly (e.g. log₂(1,000,000) ≈ 20 operations), unlike O(2ⁿ) which would explode exponentially."
    },
    {
        qnum: "Question 2 of 5",
        question: "Accessing an element in a Python list by index (e.g. lst[i]) takes what time complexity?",
        options: [
            "Constant time O(1)",
            "Logarithmic time O(log n)",
            "Linear time O(n)",
            "Quadratic time O(n²)"
        ],
        correct: 0,
        explanation: "Since the backing array stores elements in contiguous memory slots, the address of index 'i' is directly computed using the formula: Base + i × Width. This takes constant time O(1)."
    },
    {
        qnum: "Question 3 of 5",
        question: "If a dynamic array initially has capacity 4, and we append elements using the 'Doubling Capacity' strategy, what is the capacity after appending the 5th element?",
        options: [
            "5 slots",
            "8 slots",
            "10 slots",
            "16 slots"
        ],
        correct: 1,
        explanation: "The capacity expands by doubling when it becomes full. Starting with 4 slots, appending 4 elements fills it. When appending the 5th element, it overflows, triggering a resize that doubles capacity from 4 to 8."
    },
    {
        qnum: "Question 4 of 5",
        question: "Why is growing a dynamic array by doubling its capacity considered efficient?",
        options: [
            "It requires zero copy operations.",
            "It uses less memory overall.",
            "It amortizes the resizing cost to an average of O(1) per append.",
            "It prevents lists from ever becoming full."
        ],
        correct: 2,
        explanation: "Doubling capacity means resizes happen exponentially less often. The high O(n) copy cost is spread across many O(1) appends, giving an average (amortized) cost of O(1) per append."
    },
    {
        qnum: "Question 5 of 5",
        question: "What is the worst-case time complexity of searching for an element in an unsorted list of size n using Linear Search?",
        options: [
            "O(1)",
            "O(log n)",
            "O(n)",
            "O(n²)"
        ],
        correct: 2,
        explanation: "In the worst case (when the element does not exist or is at the very end of the list), Linear Search must inspect every single cell of the list, resulting in O(n) linear time."
    }
];

let currentQuizIdx = 0;

function loadQuizQuestion() {
    const q = quizQuestions[currentQuizIdx];
    document.getElementById("quiz-qnum").textContent = q.qnum;
    document.getElementById("quiz-qtext").textContent = q.question;

    const optionsContainer = document.getElementById("quiz-options");
    optionsContainer.innerHTML = "";

    q.options.forEach((opt, idx) => {
        const row = document.createElement("div");
        row.className = "quiz-option-row";
        row.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            cursor: pointer;
            transition: var(--transition-fast);
        `;
        row.innerHTML = `
            <input type="radio" name="quiz-ans" id="opt-${idx}" value="${idx}" style="cursor: pointer; accent-color: var(--accent-blue);">
            <label for="opt-${idx}" style="cursor: pointer; font-size: 13px; font-weight: 500; flex: 1;">${opt}</label>
        `;

        row.addEventListener("click", () => {
            row.querySelector("input").checked = true;
            document.querySelectorAll(".quiz-option-row").forEach(r => {
                r.style.borderColor = "var(--border-color)";
                r.style.background = "var(--bg-primary)";
            });
            row.style.borderColor = "var(--accent-blue)";
            row.style.background = "rgba(6,182,212,0.03)";
        });

        optionsContainer.appendChild(row);
    });

    const fb = document.getElementById("quiz-feedback");
    fb.style.display = "none";

    const submitBtn = document.getElementById("quiz-submit-btn");
    submitBtn.textContent = "Check Answer";
    submitBtn.onclick = checkQuizAnswer;
}

function checkQuizAnswer() {
    const q = quizQuestions[currentQuizIdx];
    const selected = document.querySelector('input[name="quiz-ans"]:checked');

    if (!selected) {
        alert("Please select an option first.");
        return;
    }

    const val = parseInt(selected.value);
    const fb = document.getElementById("quiz-feedback");

    if (val === q.correct) {
        fb.className = "quiz-feedback-box success";
        fb.style.cssText = "display: block; background: rgba(16,185,129,0.08); border: 1.5px solid var(--accent-green); color: var(--accent-green);";
        fb.innerHTML = `<strong><i class="fa-solid fa-circle-check"></i> Correct!</strong><br>${q.explanation}`;
    } else {
        fb.className = "quiz-feedback-box failed";
        fb.style.cssText = "display: block; background: rgba(239,68,68,0.08); border: 1.5px solid var(--accent-red); color: var(--accent-red);";
        fb.innerHTML = `<strong><i class="fa-solid fa-circle-xmark"></i> Incorrect.</strong><br>${q.explanation}`;
    }

    const submitBtn = document.getElementById("quiz-submit-btn");
    if (currentQuizIdx < quizQuestions.length - 1) {
        submitBtn.textContent = "Next Question";
        submitBtn.onclick = () => {
            currentQuizIdx++;
            loadQuizQuestion();
        };
    } else {
        submitBtn.textContent = "Reset Quiz";
        submitBtn.onclick = () => {
            currentQuizIdx = 0;
            loadQuizQuestion();
        };
    }
}

/* ─── Live Editor: Real-time Python Syntax Highlighting ─── */
function highlightPythonSyntax(code) {
    const escaped = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    let result = escaped;
    const tokens = [];

    const stashToken = (html) => {
        const token = `__HL_${tokens.length}__`;
        tokens.push([token, html]);
        return token;
    };

    // 1. Strings
    result = result.replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
        (match) => stashToken(`<span style="color:#a3e635">${match}</span>`));

    // 2. Comments
    result = result.replace(/(#[^\n]*)/g,
        (match) => stashToken(`<span style="color:#6b7280;font-style:italic">${match}</span>`));

    // 3. Keywords
    const keywords = ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while',
        'in', 'not', 'and', 'or', 'import', 'from', 'as', 'with', 'try', 'except',
        'finally', 'raise', 'pass', 'break', 'continue', 'lambda', 'yield',
        'True', 'False', 'None', 'is', 'del', 'global', 'nonlocal', 'assert'];
    const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    result = result.replace(kwRegex, (match) => stashToken(`<span style="color:#ff79c6;font-weight:600">${match}</span>`));

    // 4. Built-ins
    const builtins = ['print', 'len', 'range', 'list', 'dict', 'set', 'tuple',
        'int', 'float', 'str', 'bool', 'type', 'input', 'open', 'enumerate',
        'zip', 'map', 'filter', 'sorted', 'reversed', 'sum', 'min', 'max',
        'abs', 'round', 'append', 'extend', 'pop', 'remove', 'insert', 'get',
        'update', 'keys', 'values', 'items', 'split', 'join', 'strip', 'format'];
    const biRegex = new RegExp(`\\b(${builtins.join('|')})(?=\\()`, 'g');
    result = result.replace(biRegex, (match) => stashToken(`<span style="color:#8be9fd">${match}</span>`));

    // 5. Numbers
    result = result.replace(/\b(\d+\.?\d*)\b/g, (match) => stashToken(`<span style="color:#ffb86c">${match}</span>`));

    // 6. Self / cls
    result = result.replace(/\b(self|cls)\b/g, (match) => stashToken(`<span style="color:#bd93f9">${match}</span>`));

    // 7. Decorators
    result = result.replace(/(@\w+)/g, (match) => stashToken(`<span style="color:#50fa7b">${match}</span>`));

    for (let i = tokens.length - 1; i >= 0; i--) {
        const [token, html] = tokens[i];
        result = result.split(token).join(html);
    }

    return result;
}

function autoResizeTextarea(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
    const wrap = ta.closest('.live-editor-highlight-wrap');
    if (wrap) {
        const hl = wrap.querySelector('.live-code-highlight');
        if (hl) hl.style.height = ta.scrollHeight + 'px';
    }
}

function initLiveEditorHighlighting() {
    document.querySelectorAll('.live-code-textarea').forEach(ta => {
        const parent = ta.parentElement;
        if (parent.classList.contains('live-editor-highlight-wrap')) return;

        const wrap = document.createElement('div');
        wrap.className = 'live-editor-highlight-wrap';

        const hlPre = document.createElement('pre');
        hlPre.className = 'live-code-highlight';
        hlPre.setAttribute('aria-hidden', 'true');

        ta.parentNode.insertBefore(wrap, ta);
        wrap.appendChild(hlPre);
        wrap.appendChild(ta);

        ta.classList.add('with-highlight');

        function syncHighlight() {
            hlPre.innerHTML = highlightPythonSyntax(ta.value);
            hlPre.scrollTop = ta.scrollTop;
            hlPre.scrollLeft = ta.scrollLeft;
            autoResizeTextarea(ta);
        }

        syncHighlight();

        ta.addEventListener('input', syncHighlight);
        ta.addEventListener('scroll', () => {
            hlPre.scrollTop = ta.scrollTop;
            hlPre.scrollLeft = ta.scrollLeft;
        });
        ta.addEventListener('keydown', () => setTimeout(syncHighlight, 0));
    });
}

// -------------------------------------------------------------
// Module 4: Object-Oriented Programming (OOP) Basics Visualizer
// -------------------------------------------------------------
function setupOOPVisualizer() {
    // --- Collapsible Topic Accordion Behavior ---
    const topicHeaders = document.querySelectorAll(".oop-topic-header");
    topicHeaders.forEach(header => {
        header.addEventListener("click", () => {
            const body = header.nextElementSibling;
            const chevron = header.querySelector(".toggle-chevron");
            const isCollapsed = body.style.display === "none" || body.style.display === "";

            // Close other headers to make it clean accordion
            document.querySelectorAll(".oop-topic-body").forEach(b => {
                if (b !== body) {
                    b.style.display = "none";
                    const otherHeader = b.previousElementSibling;
                    const otherChevron = otherHeader.querySelector(".toggle-chevron");
                    if (otherChevron) otherChevron.style.transform = "rotate(0deg)";
                    const otherItem = b.closest(".accordion-item");
                    if (otherItem) otherItem.classList.remove("open");
                }
            });

            const parentItem = header.closest(".accordion-item");

            if (isCollapsed) {
                body.style.display = "block";
                if (parentItem) parentItem.classList.add("open");
                if (chevron) chevron.style.transform = "rotate(180deg)";
                // Smooth scroll to the top of the header
                setTimeout(() => {
                    header.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 100);
            } else {
                body.style.display = "none";
                if (parentItem) parentItem.classList.remove("open");
                if (chevron) chevron.style.transform = "rotate(0deg)";
            }
        });
    });

    // --- Visualizer 1: Class Namespace vs Instance Namespace ---
    const createList1Btn = document.getElementById("oop-create-list1-btn");
    const createList2Btn = document.getElementById("oop-create-list2-btn");
    const modifyAttrBtn = document.getElementById("oop-modify-attr-btn");
    const modifyClassBtn = document.getElementById("oop-modify-class-btn");
    const resetNsBtn = document.getElementById("oop-reset-ns-btn");

    const inst1Card = document.getElementById("oop-inst1-card");
    const inst2Card = document.getElementById("oop-inst2-card");

    const inst1Size = document.getElementById("oop-inst1-val-size");
    const inst1Data = document.getElementById("oop-inst1-val-data");
    const inst1Max = document.getElementById("oop-inst1-val-inherited-maxsize");

    const inst2Size = document.getElementById("oop-inst2-val-size");
    const inst2Data = document.getElementById("oop-inst2-val-data");
    const inst2Max = document.getElementById("oop-inst2-val-inherited-maxsize");

    const classMax = document.getElementById("oop-class-val-maxsize");
    const sandboxGuide = document.getElementById("oop-sandbox-guide");

    let isList1Active = false;
    let isList2Active = false;
    let list1SizeVal = 0;
    let classMaxSizeVal = 100;

    function updateSandboxGuide() {
        if (!sandboxGuide) return;
        if (!isList1Active && !isList2Active && classMaxSizeVal === 100) {
            sandboxGuide.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--accent-blue); margin-right: 6px;"></i> <strong>Step 1:</strong> Start by clicking <strong>Instantiate list1</strong> under Instantiation to create your first object in memory!`;
            sandboxGuide.style.background = "rgba(59, 130, 246, 0.05)";
            sandboxGuide.style.borderColor = "var(--accent-blue)";
        } else if (isList1Active && !isList2Active && list1SizeVal === 0) {
            sandboxGuide.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--accent-blue); margin-right: 6px;"></i> <strong>Step 2:</strong> Good! Now try clicking <strong>Set list1.size = 5</strong> to see how attributes are stored locally inside list1, or click <strong>Instantiate list2</strong> to create another independent object.`;
            sandboxGuide.style.background = "rgba(59, 130, 246, 0.05)";
            sandboxGuide.style.borderColor = "var(--accent-blue)";
        } else if (isList1Active && !isList2Active && list1SizeVal === 5) {
            sandboxGuide.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--accent-blue); margin-right: 6px;"></i> <strong>Step 3:</strong> Notice how <code>list1.size</code> updated to 5, but the Class namespace variables didn't change! Now click <strong>Instantiate list2</strong> to see what a second blank object looks like.`;
            sandboxGuide.style.background = "rgba(59, 130, 246, 0.05)";
            sandboxGuide.style.borderColor = "var(--accent-blue)";
        } else if (isList1Active && isList2Active && classMaxSizeVal === 100) {
            sandboxGuide.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--accent-blue); margin-right: 6px;"></i> <strong>Step 4:</strong> Both objects are in memory! Now try clicking <strong>Set ArrayList.max_size = 500</strong> to observe how modifying a class variable updates the shared value for BOTH objects simultaneously!`;
            sandboxGuide.style.background = "rgba(168, 85, 247, 0.05)";
            sandboxGuide.style.borderColor = "var(--accent-purple)";
        } else if (classMaxSizeVal === 500) {
            sandboxGuide.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--accent-green); margin-right: 6px;"></i> <strong>Completed:</strong> Amazing! You modified the class variable <code>max_size</code>, and all objects instantly inherited the new value. Click <strong>Reset Sandbox</strong> to try again!`;
            sandboxGuide.style.background = "rgba(16, 185, 129, 0.05)";
            sandboxGuide.style.borderColor = "var(--accent-green)";
        }
    }

    if (createList1Btn) {
        createList1Btn.addEventListener("click", () => {
            isList1Active = true;
            inst1Card.style.opacity = "1";
            inst1Card.style.borderColor = "var(--accent-purple)";
            inst1Size.textContent = list1SizeVal;
            inst1Data.textContent = "ArrayList([None])";
            inst1Max.textContent = classMaxSizeVal;
            modifyAttrBtn.removeAttribute("disabled");
            createList1Btn.setAttribute("disabled", "true");
            updateSandboxGuide();
        });
    }

    if (createList2Btn) {
        createList2Btn.addEventListener("click", () => {
            isList2Active = true;
            inst2Card.style.opacity = "1";
            inst2Card.style.borderColor = "var(--border-color)";
            inst2Size.textContent = "0";
            inst2Data.textContent = "ArrayList([None])";
            inst2Max.textContent = classMaxSizeVal;
            createList2Btn.setAttribute("disabled", "true");
            updateSandboxGuide();
        });
    }

    if (modifyAttrBtn) {
        modifyAttrBtn.addEventListener("click", () => {
            if (!isList1Active) return;
            list1SizeVal = 5;
            inst1Size.textContent = list1SizeVal;
            inst1Size.style.color = "var(--accent-cyan)";
            setTimeout(() => { inst1Size.style.color = "var(--accent-green)"; }, 1000);
            modifyAttrBtn.setAttribute("disabled", "true");
            updateSandboxGuide();
        });
    }

    if (modifyClassBtn) {
        modifyClassBtn.addEventListener("click", () => {
            classMaxSizeVal = 500;
            classMax.textContent = classMaxSizeVal;
            classMax.style.color = "var(--accent-cyan)";
            setTimeout(() => { classMax.style.color = "var(--accent-green)"; }, 1000);

            if (isList1Active) {
                inst1Max.textContent = classMaxSizeVal;
                inst1Max.style.color = "var(--accent-cyan)";
                setTimeout(() => { inst1Max.style.color = "var(--accent-cyan)"; }, 1000);
            }
            if (isList2Active) {
                inst2Max.textContent = classMaxSizeVal;
                inst2Max.style.color = "var(--accent-cyan)";
                setTimeout(() => { inst2Max.style.color = "var(--accent-cyan)"; }, 1000);
            }
            modifyClassBtn.setAttribute("disabled", "true");
            updateSandboxGuide();
        });
    }

    if (resetNsBtn) {
        resetNsBtn.addEventListener("click", () => {
            isList1Active = false;
            isList2Active = false;
            list1SizeVal = 0;
            classMaxSizeVal = 100;

            createList1Btn.removeAttribute("disabled");
            createList2Btn.removeAttribute("disabled");
            modifyAttrBtn.setAttribute("disabled", "true");
            modifyClassBtn.removeAttribute("disabled");

            inst1Card.style.opacity = "0.35";
            inst1Card.style.borderColor = "var(--border-color)";
            inst2Card.style.opacity = "0.35";
            inst2Card.style.borderColor = "var(--border-color)";

            inst1Size.textContent = "--";
            inst1Data.textContent = "--";
            inst1Max.textContent = "--";
            inst2Size.textContent = "--";
            inst2Data.textContent = "--";
            inst2Max.textContent = "--";

            classMax.textContent = "100";
            classMax.style.color = "var(--accent-green)";
            updateSandboxGuide();
        });
    }


    // --- Visualizer 2: The Constructor (__init__ & self) Tracer ---
    const initPrevBtn = document.getElementById("oop-init-prev-btn");
    const initNextBtn = document.getElementById("oop-init-next-btn");
    const initExpl = document.getElementById("oop-init-explanation");
    const heapObj = document.getElementById("oop-heap-object");
    const heapTitle = document.getElementById("oop-heap-title");
    const heapAddr = document.getElementById("oop-heap-address");
    const heapProps = document.getElementById("oop-heap-props");

    let currentInitStep = 0;
    const initSteps = [
        {
            lineId: "oop-init-line-7",
            explanation: "Click <strong>Next Step</strong> to find and allocate an empty block of memory in the Heap for our new object.",
            heapState: { title: "No Object Allocated", addr: "", props: "", background: "transparent", border: "1px dashed var(--border-color)" }
        },
        {
            lineId: "oop-init-line-7",
            explanation: "<strong>Step 1: Memory Allocated.</strong> Python creates an empty <code>ArrayList</code> instance in RAM at memory address <code>0x7F8E</code>. Right now, this object is a blank box with no local variables inside it.",
            heapState: { title: "ArrayList Object", addr: "0x7F8E", props: "<span style='color:var(--text-muted); font-style:italic;'>(empty namespace)</span>", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)" }
        },
        {
            lineId: "oop-init-line-2",
            explanation: "<strong>Step 2: Calling Constructor.</strong> Python automatically jumps into the <code>__init__(self)</code> method. The parameter <code>self</code> acts as a remote control pointing directly to our newly allocated box at address <code>0x7F8E</code>.",
            heapState: { title: "ArrayList (self ➔ 0x7F8E)", addr: "0x7F8E", props: "<span style='color:var(--accent-purple);'>self ➔ active binding</span>", background: "rgba(168,85,247,0.05)", border: "1.5px solid var(--accent-purple)" }
        },
        {
            lineId: "oop-init-line-4",
            explanation: "<strong>Step 3: Setting Attributes.</strong> Python runs <code>self.size = 0</code>. This creates a property named <code>size</code> inside our box at <code>0x7F8E</code> and sets its initial value to <code>0</code>.",
            heapState: { title: "ArrayList (self ➔ 0x7F8E)", addr: "0x7F8E", props: "<div>size: <span style='color:var(--accent-green);'>0</span></div>", background: "rgba(168,85,247,0.05)", border: "1.5px solid var(--accent-purple)" }
        },
        {
            lineId: "oop-init-line-5",
            explanation: "<strong>Step 4: Allocating Backing Data.</strong> Python runs <code>self.data = np.empty(1)</code>. This adds a second property named <code>data</code> inside our box, pointing to a contiguous array block elsewhere in memory. The object is now fully set up!",
            heapState: { title: "ArrayList (self ➔ 0x7F8E)", addr: "0x7F8E", props: "<div>size: <span style='color:var(--accent-green);'>0</span></div><div>data: <span style='color:var(--accent-cyan);'>[None]</span></div>", background: "rgba(168,85,247,0.05)", border: "1.5px solid var(--accent-purple)" }
        },
        {
            lineId: "oop-init-line-7",
            explanation: "<strong>Step 5: Reference Returned.</strong> The setup finishes. Python returns the memory address reference <code>0x7F8E</code> and binds it to the variable <code>obj</code>. You can now use <code>obj</code> to control this object!",
            heapState: { title: "obj = ArrayList()", addr: "0x7F8E", props: "<div>size: <span style='color:var(--accent-green);'>0</span></div><div>data: <span style='color:var(--accent-cyan);'>[None]</span></div>", background: "rgba(6,182,212,0.04)", border: "1.5px solid var(--accent-cyan)" }
        }
    ];

    function updateInitTracer() {
        // Reset all code lines highlight
        for (let i = 1; i <= 7; i++) {
            const el = document.getElementById(`oop-init-line-${i}`);
            if (el) {
                el.style.borderLeftColor = "transparent";
                el.style.backgroundColor = "rgba(255,255,255,0.01)";
            }
        }

        const step = initSteps[currentInitStep];
        const activeLine = document.getElementById(step.lineId);
        if (activeLine) {
            activeLine.style.borderLeftColor = "var(--accent-cyan)";
            activeLine.style.backgroundColor = "rgba(6,182,212,0.08)";
        }

        initExpl.innerHTML = step.explanation;
        heapTitle.textContent = step.heapState.title;
        heapAddr.textContent = step.heapState.addr;
        heapProps.innerHTML = step.heapState.props;
        heapObj.style.background = step.heapState.background;
        heapObj.style.borderColor = step.heapState.border;

        // Button state
        initPrevBtn.disabled = currentInitStep === 0;
        initNextBtn.innerHTML = currentInitStep === initSteps.length - 1 ? `Restart Tracer <i class="fa-solid fa-rotate-left"></i>` : `Next Step <i class="fa-solid fa-chevron-right"></i>`;
    }

    if (initNextBtn) {
        initNextBtn.addEventListener("click", () => {
            if (currentInitStep === initSteps.length - 1) {
                currentInitStep = 0;
            } else {
                currentInitStep++;
            }
            updateInitTracer();
        });
    }

    if (initPrevBtn) {
        initPrevBtn.addEventListener("click", () => {
            if (currentInitStep > 0) {
                currentInitStep--;
                updateInitTracer();
            }
        });
    }


    // --- Visualizer 3: Inheritance & MRO Lookup Tracer ---
    const mroBtns = document.querySelectorAll(".oop-mro-btn");
    const mroLog = document.getElementById("oop-mro-log");
    const nodeBase = document.getElementById("mro-node-base");
    const nodeSub = document.getElementById("mro-node-sub");
    const nodeInst = document.getElementById("mro-node-inst");

    const mroControls = document.getElementById("oop-mro-controls");
    const mroStepLbl = document.getElementById("oop-mro-step-lbl");
    const mroPrevBtn = document.getElementById("oop-mro-prev-btn");
    const mroNextBtn = document.getElementById("oop-mro-next-btn");

    let currentMroQuery = null;
    let currentMroStepIndex = 0;

    const mroData = {
        insertFront: [
            {
                status: "searching",
                title: "Step 1: Check 'list1' instance dictionary",
                desc: "Searching for local attributes initialized directly in the object's constructor.",
                nodeHighlights: { inst: "searching", sub: "normal", base: "normal" }
            },
            {
                status: "success",
                title: "Step 2: Check subclass namespace ('SinglyLinkedList')",
                desc: "Found method 'insertFront(self, data)' inside the class namespace. Calling function.",
                nodeHighlights: { inst: "failed", sub: "found", base: "normal" }
            }
        ],
        getSize: [
            {
                status: "searching",
                title: "Step 1: Check 'list1' instance dictionary",
                desc: "Searching for local attributes initialized directly in the object's constructor.",
                nodeHighlights: { inst: "searching", sub: "normal", base: "normal" }
            },
            {
                status: "searching",
                title: "Step 2: Check subclass namespace ('SinglyLinkedList')",
                desc: "Searching subclass for 'getSize' method...",
                nodeHighlights: { inst: "failed", sub: "searching", base: "normal" }
            },
            {
                status: "success",
                title: "Step 3: Check grandparent class namespace ('SinglyLinkedListBase')",
                desc: "Found method 'getSize(self)' inherited from parent class SinglyLinkedListBase. Calling function.",
                nodeHighlights: { inst: "failed", sub: "failed", base: "found" }
            }
        ],
        count: [
            {
                status: "searching",
                title: "Step 1: Check 'list1' instance dictionary",
                desc: "Searching for local attributes initialized directly in the object's constructor.",
                nodeHighlights: { inst: "searching", sub: "normal", base: "normal" }
            },
            {
                status: "searching",
                title: "Step 2: Check subclass namespace ('SinglyLinkedList')",
                desc: "Searching subclass for '_count' variable...",
                nodeHighlights: { inst: "failed", sub: "searching", base: "normal" }
            },
            {
                status: "success",
                title: "Step 3: Check grandparent class namespace ('SinglyLinkedListBase')",
                desc: "Found attribute '_count' inside grandparent base class SinglyLinkedListBase. Accessing variable.",
                nodeHighlights: { inst: "failed", sub: "failed", base: "found" }
            }
        ],
        invalid: [
            {
                status: "searching",
                title: "Step 1: Check 'list1' instance dictionary",
                desc: "Searching for local attributes initialized directly in the object's constructor.",
                nodeHighlights: { inst: "searching", sub: "normal", base: "normal" }
            },
            {
                status: "searching",
                title: "Step 2: Check subclass namespace ('SinglyLinkedList')",
                desc: "Searching subclass for 'deleteNode' method...",
                nodeHighlights: { inst: "failed", sub: "searching", base: "normal" }
            },
            {
                status: "searching",
                title: "Step 3: Check grandparent class namespace ('SinglyLinkedListBase')",
                desc: "Searching grandparent class for 'deleteNode' method...",
                nodeHighlights: { inst: "failed", sub: "failed", base: "searching" }
            },
            {
                status: "searching",
                title: "Step 4: Check Python's built-in root base class ('object')",
                desc: "Searching Python's root object namespace...",
                nodeHighlights: { inst: "failed", sub: "failed", base: "failed" }
            },
            {
                status: "error",
                title: "AttributeError: 'SinglyLinkedList' has no attribute 'deleteNode'",
                desc: "Search failed. Requested attribute does not exist anywhere in the inheritance tree.",
                nodeHighlights: { inst: "error", sub: "error", base: "error" }
            }
        ]
    };

    function addStep(status, title, desc) {
        const stepDiv = document.createElement("div");
        stepDiv.style.cssText = "display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-primary); transition: all 0.3s ease; animation: fadeIn 0.3s ease;";
        
        let iconHtml = "";
        if (status === "searching") {
            stepDiv.style.background = "rgba(59, 130, 246, 0.04)";
            stepDiv.style.borderColor = "rgba(59, 130, 246, 0.15)";
            iconHtml = `<i class="fa-solid fa-spinner fa-spin" style="color: var(--accent-blue);"></i>`;
        } else if (status === "failed") {
            stepDiv.style.background = "rgba(239, 68, 68, 0.02)";
            stepDiv.style.borderColor = "rgba(239, 68, 68, 0.08)";
            stepDiv.style.opacity = "0.7";
            iconHtml = `<i class="fa-solid fa-circle-xmark" style="color: var(--accent-red);"></i>`;
        } else if (status === "success") {
            stepDiv.style.background = "rgba(16, 185, 129, 0.05)";
            stepDiv.style.borderColor = "rgba(16, 185, 129, 0.15)";
            iconHtml = `<i class="fa-solid fa-circle-check" style="color: var(--accent-green);"></i>`;
        } else if (status === "error") {
            stepDiv.style.background = "rgba(239, 68, 68, 0.06)";
            stepDiv.style.borderColor = "rgba(239, 68, 68, 0.2)";
            iconHtml = `<i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-red);"></i>`;
        }

        stepDiv.innerHTML = `
            <div style="font-size: 13.5px; margin-top: 1px;">${iconHtml}</div>
            <div style="flex-grow: 1;">
                <div class="step-title" style="font-size: 12px; font-weight: 700; color: var(--text-primary); ${status === 'failed' ? 'text-decoration: line-through;' : ''}">${title}</div>
                <div class="step-desc" style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${desc}</div>
            </div>
        `;
        mroLog.appendChild(stepDiv);
    }

    function updateMroTracer() {
        if (!currentMroQuery) return;
        const steps = mroData[currentMroQuery];
        const step = steps[currentMroStepIndex];

        // Update control labels
        if (mroStepLbl) mroStepLbl.textContent = `Step ${currentMroStepIndex + 1} of ${steps.length}`;
        if (mroPrevBtn) mroPrevBtn.disabled = currentMroStepIndex === 0;
        if (mroNextBtn) {
            mroNextBtn.innerHTML = currentMroStepIndex === steps.length - 1 
                ? `Finish <i class="fa-solid fa-check"></i>` 
                : `Next Step <i class="fa-solid fa-chevron-right"></i>`;
        }

        // Render steps logs
        mroLog.innerHTML = "";
        for (let i = 0; i <= currentMroStepIndex; i++) {
            const s = steps[i];
            const isCurrent = (i === currentMroStepIndex);
            
            let status = s.status;
            let desc = s.desc;
            if (!isCurrent) {
                status = "failed";
                if (i === 0) desc = "Not found locally in the 'list1' instance dictionary.";
                else if (i === 1) desc = "Not found in the 'SinglyLinkedList' subclass methods.";
                else if (i === 2) desc = "Not found in the 'SinglyLinkedListBase' grandparent methods.";
                else if (i === 3) desc = "Not found in built-in 'object' methods.";
            }
            
            addStep(status, s.title, desc);
        }

        // Reset highlights
        [nodeInst, nodeSub, nodeBase].forEach(n => {
            if (n) {
                n.className = "mro-node-box";
                n.style.borderColor = "var(--border-color)";
                n.style.boxShadow = "none";
                n.style.background = "var(--bg-primary)";
            }
        });

        // Apply active highlights based on step
        const hl = step.nodeHighlights;
        if (nodeInst) {
            if (hl.inst === "searching") {
                nodeInst.style.borderColor = "var(--accent-blue)";
                nodeInst.style.background = "rgba(59, 130, 246, 0.05)";
                nodeInst.style.boxShadow = "0 0 10px rgba(59, 130, 246, 0.2)";
            } else if (hl.inst === "error") {
                nodeInst.style.borderColor = "var(--accent-red)";
                nodeInst.style.background = "rgba(239, 68, 68, 0.04)";
            }
        }

        if (nodeSub) {
            if (hl.sub === "searching") {
                nodeSub.style.borderColor = "var(--accent-blue)";
                nodeSub.style.background = "rgba(59, 130, 246, 0.05)";
                nodeSub.style.boxShadow = "0 0 10px rgba(59, 130, 246, 0.2)";
            } else if (hl.sub === "found") {
                nodeSub.style.borderColor = "var(--accent-green)";
                nodeSub.style.background = "rgba(16, 185, 129, 0.05)";
                nodeSub.style.boxShadow = "0 0 10px rgba(16, 185, 129, 0.2)";
            } else if (hl.sub === "error") {
                nodeSub.style.borderColor = "var(--accent-red)";
                nodeSub.style.background = "rgba(239, 68, 68, 0.04)";
            }
        }

        if (nodeBase) {
            if (hl.base === "searching") {
                nodeBase.style.borderColor = "var(--accent-blue)";
                nodeBase.style.background = "rgba(59, 130, 246, 0.05)";
                nodeBase.style.boxShadow = "0 0 10px rgba(59, 130, 246, 0.2)";
            } else if (hl.base === "found") {
                nodeBase.style.borderColor = "var(--accent-green)";
                nodeBase.style.background = "rgba(16, 185, 129, 0.05)";
                nodeBase.style.boxShadow = "0 0 10px rgba(16, 185, 129, 0.2)";
            } else if (hl.base === "error") {
                nodeBase.style.borderColor = "var(--accent-red)";
                nodeBase.style.background = "rgba(239, 68, 68, 0.04)";
            }
        }
    }

    mroBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            mroBtns.forEach(b => {
                b.classList.remove("btn-primary");
                b.classList.add("btn-secondary");
            });
            btn.classList.remove("btn-secondary");
            btn.classList.add("btn-primary");

            const attr = btn.getAttribute("data-attr");
            currentMroQuery = attr;
            currentMroStepIndex = 0;

            if (mroControls) mroControls.style.display = "flex";
            updateMroTracer();
        });
    });

    if (mroNextBtn) {
        mroNextBtn.addEventListener("click", () => {
            if (!currentMroQuery) return;
            const steps = mroData[currentMroQuery];
            if (currentMroStepIndex < steps.length - 1) {
                currentMroStepIndex++;
                updateMroTracer();
            } else {
                // Done / Finish
                mroControls.style.display = "none";
                mroBtns.forEach(b => {
                    b.classList.remove("btn-primary");
                    b.classList.add("btn-secondary");
                });
                currentMroQuery = null;
                mroLog.innerHTML = `
                    <div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 20px 0; border: 1px dashed var(--border-color); border-radius: 6px; background: rgba(255,255,255,0.01);">
                        <i class="fa-solid fa-circle-info" style="margin-right: 6px; color: var(--accent-blue);"></i> Select a lookup command above to watch the attribute search process step-by-step.
                    </div>
                `;
                [nodeInst, nodeSub, nodeBase].forEach(n => {
                    if (n) {
                        n.className = "mro-node-box";
                        n.style.borderColor = "var(--border-color)";
                        n.style.boxShadow = "none";
                        n.style.background = "var(--bg-primary)";
                    }
                });
            }
        });
    }

    if (mroPrevBtn) {
        mroPrevBtn.addEventListener("click", () => {
            if (currentMroStepIndex > 0) {
                currentMroStepIndex--;
                updateMroTracer();
            }
        });
    }
}
