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
    if (!container) return;

    const values = [45, 12, 89, 34, 76, 90, 21, 55];
    container.innerHTML = "";

    values.forEach((val, idx) => {
        const cell = document.createElement("div");
        cell.className = "memory-cell-item";
        cell.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            border: 1px solid var(--border-color);
            background: var(--bg-card);
            border-radius: 6px;
            padding: 8px 12px;
            cursor: pointer;
            transition: all var(--transition-fast);
            min-width: 60px;
            text-align: center;
        `;
        cell.innerHTML = `
            <span style="font-size: 10px; color: var(--text-muted);">[${idx}]</span>
            <strong style="font-size: 16px; color: var(--text-primary); margin-top: 4px;">${val}</strong>
            <span style="font-size: 9px; color: var(--accent-orange); margin-top: 4px; font-family: monospace;">0x${(0x1000 + idx * 8).toString(16).toUpperCase()}</span>
        `;

        cell.addEventListener("click", () => {
            // Reset active states
            document.querySelectorAll(".memory-cell-item").forEach(c => {
                c.style.borderColor = "var(--border-color)";
                c.style.background = "var(--bg-card)";
                c.style.transform = "none";
            });

            // Highlight selected
            cell.style.borderColor = "var(--accent-blue)";
            cell.style.background = "rgba(6,182,212,0.06)";
            cell.style.transform = "translateY(-2px)";

            // Update formula explanation label
            const addressHex = "0x" + (0x1000 + idx * 8).toString(16).toUpperCase();
            const stepText = `Index [${idx}] Address: 0x1000 + (${idx} × 8) = 0x1000 + ${idx * 8} = ${addressHex}`;
            document.getElementById("calc-step-lbl").innerHTML = `
                <i class="fa-solid fa-calculator" style="color:var(--accent-blue); margin-right:6px;"></i> ${stepText}<br>
                <span style="color:var(--accent-green); font-size:12px; font-weight:normal;">Loaded element: <strong>${val}</strong> in exactly 1 operational step!</span>
            `;
        });

        container.appendChild(cell);
    });
}

// -------------------------------------------------------------
// Module 3: Dynamic Array Simulator
// -------------------------------------------------------------
let simSize = 0;
let simCapacity = 1;
let simData = [null];
let resizeCount = 0;

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

    for (let i = 0; i < simCapacity; i++) {
        const slot = document.createElement("div");
        const val = simData[i];
        slot.style.cssText = `
            width: 45px;
            height: 45px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 700;
            transition: all 0.3s ease;
        `;

        if (i < simSize) {
            slot.style.background = "var(--accent-blue-glow)";
            slot.style.border = "1.5px solid var(--accent-blue)";
            slot.style.color = "var(--accent-blue)";
            slot.textContent = val;
        } else {
            slot.style.background = "var(--bg-primary)";
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
    const randomVal = Math.floor(Math.random() * 90) + 10;

    let resizeTriggered = false;
    let copies = 0;
    let oldCapacity = simCapacity;

    if (simSize === simCapacity) {
        resizeTriggered = true;
        resizeCount++;
        copies = simSize;

        // Doubling vs Fixed strategies
        if (strategy === "double") {
            simCapacity *= 2;
        } else {
            simCapacity += 4; // Use +4 slots instead of +1000 for visual clarity
        }

        // Expand backing array elements
        const newData = new Array(simCapacity).fill(null);
        for (let i = 0; i < simSize; i++) {
            newData[i] = simData[i];
        }
        simData = newData;
    }

    // Insert element
    simData[simSize] = randomVal;
    simSize++;

    renderSimArray();

    // Visual Log Feedback
    if (resizeTriggered) {
        log.style.color = "var(--accent-orange)";
        log.innerHTML = `
            <strong><i class="fa-solid fa-triangle-exclamation"></i> Capacity reached!</strong><br>
            Allocating new array. Capacity: ${oldCapacity} ➔ ${simCapacity}.<br>
            Copied ${copies} elements to new memory slots. Appended element ${randomVal}.
        `;
    } else {
        log.style.color = "var(--text-primary)";
        log.innerHTML = `
            <i class="fa-solid fa-circle-info" style="color:var(--accent-blue);"></i> Appended element ${randomVal} at index ${simSize - 1}.<br>
            No resize needed. Next index occupies empty pre-allocated slot.
        `;
    }
}

function resetSimArray() {
    simSize = 0;
    simCapacity = 1;
    simData = [null];
    resizeCount = 0;

    const log = document.getElementById("resize-activity-log");
    if (log) {
        log.style.color = "var(--text-primary)";
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
