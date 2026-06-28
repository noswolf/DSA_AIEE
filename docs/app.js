// -------------------------------------------------------------
// Pyodide (WASM Python) Initialization and Console Controller
// -------------------------------------------------------------
let pyodideInstance = null;
let currentOutputBuffer = "";

// Helper to support Tab key indentation in textareas (inserts 4 spaces)
function enableTabIndentation(textarea) {
    textarea.addEventListener("keydown", function(e) {
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
        // If there was a printed output, show it, otherwise show evaluated result if it isn't None
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
// Navigation and Accordion Control
// -------------------------------------------------------------
function navigateToSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll(".content-section");
    sections.forEach(sec => sec.classList.remove("active"));
    
    // Show targeted section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add("active");
        // Scroll to top of main content
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
    } else if (sectionId === "welcome-section") {
        headerTitle.textContent = "Welcome & Course Introduction";
    }

    // Perform specific tab initialization
    if (sectionId === "module3-section") {
        updateBigOGraph(parseInt(document.getElementById("n-slider").value));
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

        // Check if there is already a footer to avoid duplicate injections
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
            // Placeholder to keep "Next" button aligned to the right if there's no "Previous"
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
            // Placeholder to keep "Previous" button aligned to the left if there's no "Next"
            const placeholder = document.createElement("div");
            placeholder.style.flex = "1";
            footer.appendChild(placeholder);
        }

        section.appendChild(footer);
    });
}

// Setup navigation listeners
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
    const themeText = document.getElementById("theme-text");
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            document.body.classList.toggle("light-mode");
            const icon = themeToggleBtn.querySelector("i");
            if (icon) {
                if (document.body.classList.contains("light-mode")) {
                    icon.className = "fa-solid fa-moon";
                } else {
                    icon.className = "fa-solid fa-sun";
                }
            }
            if (themeText) {
                if (document.body.classList.contains("light-mode")) {
                    themeText.textContent = "Dark Mode";
                } else {
                    themeText.textContent = "Light Mode";
                }
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

    // Accordions toggle (Single Open Behavior)
    const accordionTriggers = document.querySelectorAll(".accordion-trigger");
    accordionTriggers.forEach(trigger => {
        trigger.addEventListener("click", () => {
            const item = trigger.closest(".accordion-item");
            const isOpen = item.classList.contains("open");
            
            // Close all other accordions in the same group
            const group = item.closest(".accordion-group");
            if (group) {
                const siblingItems = group.querySelectorAll(".accordion-item");
                siblingItems.forEach(sib => {
                    if (sib !== item) {
                        sib.classList.remove("open");
                    }
                });
            }
            
            // Toggle current item
            item.classList.toggle("open", !isOpen);
            
            // Trigger resize/sync for any live editors inside the newly opened accordion
            if (item.classList.contains("open")) {
                item.querySelectorAll('.live-code-textarea').forEach(ta => {
                    ta.dispatchEvent(new Event('input'));
                });
                setTimeout(() => {
                    item.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 150);
            }

        });
    });

    // Why Python interactive tabs toggle
    const whyTabs = document.querySelectorAll(".why-tab-btn");
    const whyContents = document.querySelectorAll(".why-tab-content");
    whyTabs.forEach(btn => {
        btn.addEventListener("click", () => {
            whyTabs.forEach(t => t.classList.remove("active"));
            whyContents.forEach(c => c.classList.remove("active"));
            
            btn.classList.add("active");
            const targetId = `why-content-${btn.getAttribute("data-tab")}`;
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add("active");
            }
        });
    });

    // Initialize components
    initPyodide();
    setupEditors();
    setupLabs();
    setupRecursionVisualizer();
    setupBigOSlider();
    setupBenchmarker();
    loadQuizQuestion();
    setupWhyPythonSimulators();
    setupDynamicTypingVisualizer();
    setupCollectionsExplorer();
    setupSectionNavigation();
    if (typeof switchExceptionScenario === "function") {
        switchExceptionScenario('ZeroDivisionError');
    }
    if (typeof switchFlowTab === "function") {
        switchFlowTab('cond');
    }
    if (typeof highlightAllStaticCode === "function") {
        highlightAllStaticCode();
    }

    // Enable Tab indentation for all code editors
    const allCodeEditors = document.querySelectorAll(".editor-textarea, #global-console-textarea");
    allCodeEditors.forEach(textarea => {
        enableTabIndentation(textarea);
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
    
    // Clear terminal console
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
});


const labTests = {
    lab1_1: {
        tests: `
try:
    assert is_multiple(4, 3) == False
    assert is_multiple(100, 3) == False
    assert is_multiple(4, 2) == True
    assert is_multiple(21, 3) == True
    assert is_multiple(-40, 2) == True
    assert is_multiple(-90, 3) == True
    print("Verification Passed: All unit tests run successfully!")
except AssertionError:
    print("Verification Failed: Return value is incorrect for some test cases.")
except Exception as e:
    print(f"Verification Failed with error: {e}")
`
    },
    lab1_2: {
        tests: `
import inspect
try:
    # Check syntax constraint
    src = inspect.getsource(is_even)
    if '*' in src or '/' in src or '%' in src:
        raise ValueError("Operator violation: Multiplication (*), division (/), or modulo (%) are forbidden!")
    
    assert is_even(0) == True
    assert is_even(3) == False
    assert is_even(9) == False
    assert is_even(4) == True
    assert is_even(10) == True
    assert is_even(-5) == False
    assert is_even(-15) == False
    assert is_even(-20) == True
    assert is_even(-8) == True
    print("Verification Passed: All unit tests run successfully without disallowed operators!")
except AssertionError:
    print("Verification Failed: Return value is incorrect for some values.")
except ValueError as ve:
    print(f"Verification Failed: {ve}")
except Exception as e:
    print(f"Verification Failed with error: {e}")
`
    },
    lab1_3: {
        tests: `
import inspect
try:
    # Check syntax constraint
    src = inspect.getsource(minmax_iter)
    if 'min(' in src or 'max(' in src or 'sorted(' in src or '.sort(' in src:
        raise ValueError("Operator violation: min(), max(), sorted() or .sort() are forbidden!")
        
    assert minmax_iter([1000, -77777, -4, 0, 9999, -99]) == (-77777, 9999)
    assert minmax_iter([4, 2, 3, -1, -2, 0, 1]) == (-2, 4)
    assert minmax_iter([3, 1, 4, 1, 5, 9, 2, 6, 5, 3]) == (1, 9)
    assert minmax_iter([-7, -2, -5, -10, 0]) == (-10, 0)
    assert minmax_iter([42]) == (42, 42)
    print("Verification Passed: All unit tests run successfully!")
except AssertionError:
    print("Verification Failed: Return value is incorrect for some arrays.")
except ValueError as ve:
    print(f"Verification Failed: {ve}")
except Exception as e:
    print(f"Verification Failed with error: {e}")
`
    },
    lab1_4: {
        tests: `
try:
    res1 = count_vowels("tissue")
    assert isinstance(res1, dict), "Result must be a dictionary"
    assert res1.get('a', 0) == 0
    assert res1.get('e', 0) == 1
    assert res1.get('i', 0) == 1
    assert res1.get('o', 0) == 0
    assert res1.get('u', 0) == 1
    
    res2 = count_vowels("okonomiyaki")
    assert res2.get('a', 0) == 1
    assert res2.get('e', 0) == 0
    assert res2.get('i', 0) == 2
    assert res2.get('o', 0) == 3
    assert res2.get('u', 0) == 0
    print("Verification Passed: Vowels count dictionary matched test cases!")
except AssertionError as ae:
    print(f"Verification Failed: Result values incorrect. {ae}")
except Exception as e:
    print(f"Verification Failed with error: {e}")
`
    },
    lab1_5: {
        tests: `
try:
    assert 'result' in globals() or 'result' in locals(), "Variable 'result' is not defined!"
    assert result == [0, 2, 6, 12, 20, 30, 42, 56, 72, 90], f"Result is incorrect: {result}"
    print("Verification Passed: Output matches the sequence of index products [i * (i+1)]!")
except AssertionError as ae:
    print(f"Verification Failed: {ae}")
except Exception as e:
    print(f"Verification Failed with error: {e}")
`
    }
};

function setupLabs() {
    const verifyButtons = document.querySelectorAll(".verify-editor-btn");
    
    verifyButtons.forEach(btn => {
        btn.addEventListener("click", async () => {
            const labId = btn.getAttribute("data-lab");
            const container = btn.closest(".embedded-editor-container");
            const textarea = container.querySelector(".editor-textarea");
            const outputField = container.querySelector(".editor-output");
            const statusDiv = document.getElementById(labId + "-status");
            
            outputField.textContent = "Verifying solution with tests...\n";
            statusDiv.style.display = "none";
            
            if (!pyodideInstance) {
                outputField.textContent = "Python interpreter is loading. Please try again shortly.";
                return;
            }
            
            // Combine user code and tests
            const executionCode = textarea.value + "\n" + labTests[labId].tests;
            const output = await runPythonCode(executionCode);
            outputField.textContent = output;
            
            // Set verification UI feedback
            if (output.includes("Verification Passed")) {
                statusDiv.className = "verification-status success";
                statusDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> Success! Challenge completed successfully.`;
                statusDiv.style.display = "flex";
            } else {
                statusDiv.className = "verification-status failed";
                statusDiv.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Failed. Check the error traceback in output terminal.`;
                statusDiv.style.display = "flex";
            }
        });
    });
}

function switchLabTab(tabId) {
    const tabs = document.querySelectorAll(".lab-tab");
    const contents = document.querySelectorAll(".lab-tab-content");
    
    tabs.forEach(tab => {
        if (tab.getAttribute("onclick").includes(tabId)) {
            tab.classList.add("active");
        } else {
            tab.classList.remove("active");
        }
    });
    
    contents.forEach(content => {
        if (content.id === tabId) {
            content.classList.add("active");
        } else {
            content.classList.remove("active");
        }
    });
}

// -------------------------------------------------------------
// Textarea Editors Setup
// -------------------------------------------------------------
function setupEditors() {
    const editors = document.querySelectorAll(".embedded-editor-container");
    editors.forEach(container => {
        const textarea = container.querySelector(".editor-textarea");
        const runBtn = container.querySelector(".run-editor-btn");
        const outputField = container.querySelector(".editor-output");
        
        if (runBtn && textarea && outputField) {
            runBtn.addEventListener("click", async () => {
                outputField.textContent = "Running code...";
                const result = await runPythonCode(textarea.value);
                outputField.textContent = result || "Execution finished (no output).";
            });
        }
    });
}

// -------------------------------------------------------------

// Module 2: Recursion Visualizer Engine
// -------------------------------------------------------------
let recursionSteps = [];
let currentRecStepIdx = -1;
let treeNodes = [];
let recCodeTemplate = {
    factorial: {
        code: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)`,
        highlights: [
            [0], // Init
            [1], // If base check
            [2], // Base case return
            [3], // Recursive call call
            [3], // Returning multiplication
        ]
    },
    fibonacci: {
        code: `def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)`,
        highlights: [
            [0],
            [1],
            [2],
            [3]
        ]
    },
    sum: {
        code: `def sum_n(n):
    if n <= 0:
        return 0
    return n + sum_n(n - 1)`,
        highlights: [
            [0],
            [1],
            [2],
            [3]
        ]
    }
};

const recAlgoExplanations = {
    factorial: `
        <div class="rec-explainer-grid">
            <div class="rec-explainer-card">
                <div class="card-title">📌 Concept</div>
                <div class="card-value">Calculates factorial of n<br>(n! = n × (n-1) × ... × 1)</div>
            </div>
            <div class="rec-explainer-card">
                <div class="card-title">🌿 Recursion Type</div>
                <div class="card-value">
                    <span style="display: inline-block; background: rgba(6,182,212,0.12); color: var(--accent-cyan); border: 1px solid rgba(6,182,212,0.2); padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">Linear Recursion</span>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">Single call per step</div>
                </div>
            </div>
            <div class="rec-explainer-card">
                <div class="card-title">🎯 Learning Objective</div>
                <div class="card-value">Learn the simplest recursive form. The calls form a straight vertical pipeline.</div>
            </div>
            <div class="rec-explainer-card">
                <div class="card-title">🔄 Execution Flow</div>
                <div class="card-value">Descends to <code>fact(1)</code> (Base Case), then multiplies numbers as they return back up (1 → 2 → 6 → 24).</div>
            </div>
        </div>
    `,
    fibonacci: `
        <div class="rec-explainer-grid">
            <div class="rec-explainer-card">
                <div class="card-title">📌 Concept</div>
                <div class="card-value">Finds n-th Fibonacci term<br>(F(n) = F(n-1) + F(n-2))</div>
            </div>
            <div class="rec-explainer-card">
                <div class="card-title">🌿 Recursion Type</div>
                <div class="card-value">
                    <span style="display: inline-block; background: rgba(168,85,247,0.12); color: var(--accent-purple); border: 1px solid rgba(168,85,247,0.2); padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">Double Recursion</span>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">Two branching calls</div>
                </div>
            </div>
            <div class="rec-explainer-card">
                <div class="card-title">🎯 Learning Objective</div>
                <div class="card-value">Understand how calls branch into a tree. Foundation for divide-and-conquer.</div>
            </div>
            <div class="rec-explainer-card">
                <div class="card-title">🔄 Execution Flow</div>
                <div class="card-value">Splits left/right. Branches descend to base cases (n ≤ 1), then returned values are summed.</div>
            </div>
        </div>
    `,
    sum: `
        <div class="rec-explainer-grid">
            <div class="rec-explainer-card">
                <div class="card-title">📌 Concept</div>
                <div class="card-value">Sum of integers from 1 to n<br>(1 + 2 + ... + n)</div>
            </div>
            <div class="rec-explainer-card">
                <div class="card-title">🌿 Recursion Type</div>
                <div class="card-value">
                    <span style="display: inline-block; background: rgba(16,185,129,0.12); color: var(--accent-green); border: 1px solid rgba(16,185,129,0.2); padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">Linear Reduction</span>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">Refactored loop iteration</div>
                </div>
            </div>
            <div class="rec-explainer-card">
                <div class="card-title">🎯 Learning Objective</div>
                <div class="card-value">See how standard loop iterations can be written as recursive state transitions.</div>
            </div>
            <div class="rec-explainer-card">
                <div class="card-title">🔄 Execution Flow</div>
                <div class="card-value">Decrements n by 1 until n = 0 (Base Case), then accumulates sum as returned values bubble up.</div>
            </div>
        </div>
    `
};

function updateRecExplanation() {
    const algo = document.getElementById("rec-algorithm").value;
    const explainer = document.getElementById("rec-algo-explainer");
    if (explainer && recAlgoExplanations[algo]) {
        explainer.innerHTML = recAlgoExplanations[algo];
    }
}

function setupRecursionVisualizer() {
    const algorithmSelect = document.getElementById("rec-algorithm");
    const inputField = document.getElementById("rec-input");
    const startBtn = document.getElementById("rec-start-btn");
    const stepBtn = document.getElementById("rec-step-btn");
    const resetBtn = document.getElementById("rec-reset-btn");
    
    // Set initial template code and explanation
    updateRecCodeDisplay();
    updateRecExplanation();
    
    algorithmSelect.addEventListener("change", () => {
        updateRecCodeDisplay();
        updateRecExplanation();
        resetRecursionVisualizer();
    });
    
    startBtn.addEventListener("click", () => {
        initializeRecursionTrace();
    });
    
    stepBtn.addEventListener("click", () => {
        stepRecursionTrace();
    });
    
    resetBtn.addEventListener("click", () => {
        resetRecursionVisualizer();
    });
    
    // Setup Drag-to-Pan support
    setupTreePan();
}

function updateRecCodeDisplay() {
    highlightCodeLine(-1);
}

function resetRecursionVisualizer() {
    const stackContainer = document.getElementById("stack-container");
    const traceLog = document.getElementById("trace-log");
    const stepBtn = document.getElementById("rec-step-btn");
    
    stackContainer.innerHTML = '<div class="empty-stack-msg" id="empty-tree-msg">Tree is empty. Click Initialize.</div>';
    traceLog.innerHTML = 'Initializing visual logs...';
    
    stepBtn.disabled = true;
    recursionSteps = [];
    currentRecStepIdx = -1;
    treeNodes = [];
    updateRecCodeDisplay();
    resetTreeZoom();
}

function initializeRecursionTrace() {
    const algo = document.getElementById("rec-algorithm").value;
    const n = parseInt(document.getElementById("rec-input").value);
    
    if (isNaN(n) || n < 1 || n > 5) {
        alert("Please enter a valid N between 1 and 5.");
        return;
    }
    
    resetTreeZoom();
    
    const stackContainer = document.getElementById("stack-container");
    stackContainer.innerHTML = '<svg id="rec-tree-svg" viewBox="0 0 540 240" preserveAspectRatio="xMidYMin meet" style="width: 100%; height: 100%;"></svg>';
    
    recursionSteps = [];
    treeNodes = [];
    
    if (algo === "factorial") {
        generateFactorialSteps(n);
    } else if (algo === "sum") {
        generateSumSteps(n);
    } else if (algo === "fibonacci") {
        generateFibonacciSteps(n);
    }
    
    currentRecStepIdx = 0;
    document.getElementById("rec-step-btn").disabled = false;
    document.getElementById("trace-log").innerHTML = '<div class="log-entry info">Initialized visual tracker with parameters.</div>';
    renderRecursionStep();
}

// Generate traces
function generateFactorialSteps(n) {
    let callId = 1;
    
    function traceFact(val, parentFrameId) {
        let frameId = callId++;
        // Push call step
        recursionSteps.push({
            type: "call",
            name: `factorial(${val})`,
            frameId: frameId,
            parentFrameId: parentFrameId,
            params: { n: val },
            line: 1, // 'if n <= 1:' check
            desc: `Call factorial(${val}). Checking if n <= 1.`
        });
        
        if (val <= 1) {
            recursionSteps.push({
                type: "base",
                name: `factorial(${val})`,
                frameId: frameId,
                parentFrameId: parentFrameId,
                params: { n: val },
                line: 2, // 'return 1'
                retVal: 1,
                desc: `Base case reached! factorial(${val}) returns 1.`
            });
            return 1;
        }
        
        // Push recursive descent step
        recursionSteps.push({
            type: "descent",
            name: `factorial(${val})`,
            frameId: frameId,
            parentFrameId: parentFrameId,
            params: { n: val },
            line: 3, // 'return n * factorial(n - 1)'
            desc: `n (${val}) > 1. Needs value of factorial(${val - 1}) first. Spawning call...`
        });
        
        let childVal = traceFact(val - 1, frameId);
        let myVal = val * childVal;
        
        recursionSteps.push({
            type: "return",
            name: `factorial(${val})`,
            frameId: frameId,
            parentFrameId: parentFrameId,
            params: { n: val },
            line: 3, // computes multiplication
            retVal: myVal,
            desc: `Returned value: factorial(${val - 1}) = ${childVal}. Compute ${val} * ${childVal} = ${myVal}.`
        });
        
        return myVal;
    }
    
    traceFact(n, null);
}

function generateSumSteps(n) {
    let callId = 1;
    
    function traceSum(val, parentFrameId) {
        let frameId = callId++;
        recursionSteps.push({
            type: "call",
            name: `sum_n(${val})`,
            frameId: frameId,
            parentFrameId: parentFrameId,
            params: { n: val },
            line: 1,
            desc: `Call sum_n(${val}). Checking base case condition.`
        });
        
        if (val <= 0) {
            recursionSteps.push({
                type: "base",
                name: `sum_n(${val})`,
                frameId: frameId,
                parentFrameId: parentFrameId,
                params: { n: val },
                line: 2,
                retVal: 0,
                desc: `Base case reached! sum_n(${val}) returns 0.`
            });
            return 0;
        }
        
        recursionSteps.push({
            type: "descent",
            name: `sum_n(${val})`,
            frameId: frameId,
            parentFrameId: parentFrameId,
            params: { n: val },
            line: 3,
            desc: `n > 0. Must calculate sum_n(${val - 1}) first.`
        });
        
        let childVal = traceSum(val - 1, frameId);
        let myVal = val + childVal;
        
        recursionSteps.push({
            type: "return",
            name: `sum_n(${val})`,
            frameId: frameId,
            parentFrameId: parentFrameId,
            params: { n: val },
            line: 3,
            retVal: myVal,
            desc: `Return bubble: sum_n(${val - 1}) returned ${childVal}. Return ${val} + ${childVal} = ${myVal}.`
        });
        
        return myVal;
    }
    traceSum(n, null);
}

function generateFibonacciSteps(n) {
    let callId = 1;
    
    function traceFib(val, parentFrameId) {
        let frameId = callId++;
        recursionSteps.push({
            type: "call",
            name: `fib(${val})`,
            frameId: frameId,
            parentFrameId: parentFrameId,
            params: { n: val },
            line: 1,
            desc: `Call fib(${val}). Check if n <= 1.`
        });
        
        if (val <= 1) {
            recursionSteps.push({
                type: "base",
                name: `fib(${val})`,
                frameId: frameId,
                parentFrameId: parentFrameId,
                params: { n: val },
                line: 2,
                retVal: val,
                desc: `Base case! fib(${val}) returns ${val}.`
            });
            return val;
        }
        
        recursionSteps.push({
            type: "descent",
            name: `fib(${val})`,
            frameId: frameId,
            parentFrameId: parentFrameId,
            params: { n: val },
            line: 3,
            desc: `Branching left: Need value of fib(${val - 1}) first.`
        });
        
        let left = traceFib(val - 1, frameId);
        
        recursionSteps.push({
            type: "descent-right",
            name: `fib(${val})`,
            frameId: frameId,
            parentFrameId: parentFrameId,
            params: { n: val, leftVal: left },
            line: 3,
            desc: `Branching right: fib(${val - 1}) returned ${left}. Now need fib(${val - 2}).`
        });
        
        let right = traceFib(val - 2, frameId);
        let myVal = left + right;
        
        recursionSteps.push({
            type: "return",
            name: `fib(${val})`,
            frameId: frameId,
            parentFrameId: parentFrameId,
            params: { n: val },
            line: 3,
            retVal: myVal,
            desc: `Combine branches: fib(${val - 1}) = ${left}, fib(${val - 2}) = ${right}. Returns ${left} + ${right} = ${myVal}.`
        });
        
        return myVal;
    }
    traceFib(n, null);
}

function stepRecursionTrace() {
    if (currentRecStepIdx < recursionSteps.length - 1) {
        currentRecStepIdx++;
        renderRecursionStep();
    } else {
        document.getElementById("rec-step-btn").disabled = true;
        const traceLog = document.getElementById("trace-log");
        traceLog.innerHTML += `<div class="log-entry success">Recursion Visualizer completed. Trace finished.</div>`;
        traceLog.scrollTop = traceLog.scrollHeight;
    }
}

function renderRecursionStep() {
    const step = recursionSteps[currentRecStepIdx];
    const traceLog = document.getElementById("trace-log");
    
    // Update logs
    let logClass = "info";
    if (step.type === "call") logClass = "call";
    else if (step.type === "descent" || step.type === "descent-right") logClass = "descent";
    else if (step.type === "base") logClass = "base";
    else if (step.type === "return") logClass = "return";
    
    if (currentRecStepIdx === recursionSteps.length - 1 && step.type === "return") {
        logClass = "success";
    }
    
    traceLog.innerHTML += `<div class="log-entry ${logClass}">[Step ${currentRecStepIdx + 1}] ${step.desc}</div>`;
    traceLog.scrollTop = traceLog.scrollHeight;
    
    // Update Tree nodes data structure
    if (step.type === "call") {
        // Calculate tree positioning
        let depth = 0;
        let x = 270; // Center of 540px canvas
        let y = 20;
        
        // Find parent
        if (step.parentFrameId !== null) {
            const parentNode = treeNodes.find(n => n.id === step.parentFrameId);
            if (parentNode) {
                depth = parentNode.depth + 1;
                y = parentNode.y + 38; // depth step
                
                const algo = document.getElementById("rec-algorithm").value;
                if (algo === "fibonacci") {
                    // Binary tree horizontal offsets
                    let widthOffset = 110;
                    if (depth === 1) widthOffset = 110;
                    else if (depth === 2) widthOffset = 55;
                    else if (depth === 3) widthOffset = 28;
                    else if (depth === 4) widthOffset = 14;
                    
                    const siblings = treeNodes.filter(n => n.parentId === parentNode.id);
                    if (siblings.length === 0) {
                        x = parentNode.x - widthOffset; // Left branch
                    } else {
                        x = parentNode.x + widthOffset; // Right branch
                    }
                } else {
                    // Linear recursion tree
                    x = parentNode.x;
                }
            }
        }
        
        // Set other active nodes to waiting
        treeNodes.forEach(n => {
            if (n.state === "active") n.state = "waiting";
        });
        
        // Push new node
        treeNodes.push({
            id: step.frameId,
            parentId: step.parentFrameId,
            name: step.name,
            x: x,
            y: y,
            depth: depth,
            state: "active",
            retVal: null
        });
    }
    else if (step.type === "descent" || step.type === "descent-right") {
        const node = treeNodes.find(n => n.id === step.frameId);
        if (node) {
            node.state = "waiting";
        }
    }
    else if (step.type === "base" || step.type === "return") {
        const node = treeNodes.find(n => n.id === step.frameId);
        if (node) {
            node.state = "returned";
            node.retVal = step.retVal;
            if (step.type === "base") {
                node.isBase = true;
            }
        }
        
        // Reactivate parent node
        if (step.parentFrameId !== null) {
            const parentNode = treeNodes.find(n => n.id === step.parentFrameId);
            if (parentNode && parentNode.state !== "returned") {
                parentNode.state = "active";
            }
        }
    }
    
    // Draw the tree
    drawRecursionTree();
    
    // Highlight code line
    highlightCodeLine(step.line);
}

function drawRecursionTree() {
    const svg = document.getElementById("rec-tree-svg");
    if (!svg) return;
    
    // Clear SVG
    svg.innerHTML = "";
    
    // Get container size dynamically
    const container = document.getElementById("stack-container");
    const width = 540; // Fixed width for viewBox
    
    // Auto adjust root node x to center of container
    if (treeNodes.length > 0 && treeNodes[0].parentId === null && Math.abs(treeNodes[0].x - width / 2) > 5) {
        const deltaX = width / 2 - treeNodes[0].x;
        treeNodes.forEach(n => n.x += deltaX);
    }
    
    // 1. Draw lines (edges)
    treeNodes.forEach(node => {
        if (node.parentId !== null) {
            const parent = treeNodes.find(n => n.id === node.parentId);
            if (parent) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", parent.x);
                line.setAttribute("y1", parent.y);
                line.setAttribute("x2", node.x);
                line.setAttribute("y2", node.y);
                svg.appendChild(line);
            }
        }
    });
    
    // 2. Draw nodes (rounded rects)
    treeNodes.forEach(node => {
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        
        // Node dimensions
        const rectW = 26;
        const rectH = 13;
        const rx = node.x - rectW / 2;
        const ry = node.y - rectH / 2;
        
        // Rect element
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", rx);
        rect.setAttribute("y", ry);
        rect.setAttribute("width", rectW);
        rect.setAttribute("height", rectH);
        rect.setAttribute("rx", "3");
        rect.setAttribute("ry", "3");
        
        // Select colors based on node state
        let fill = "rgba(148, 163, 184, 0.1)"; // default waiting/inactive
        let stroke = "var(--border-color)";
        let glow = "none";
        
        if (node.state === "active") {
            fill = "rgba(6, 182, 212, 0.15)"; // Cyan active
            stroke = "var(--accent-cyan)";
            glow = "0 0 8px var(--accent-cyan)";
        } else if (node.state === "waiting") {
            fill = "rgba(168, 85, 247, 0.1)"; // Purple descent
            stroke = "var(--accent-purple)";
        } else if (node.state === "returned") {
            fill = "rgba(16, 185, 129, 0.15)"; // Green returned
            stroke = "var(--accent-green)";
        }
        
        rect.setAttribute("fill", fill);
        rect.setAttribute("stroke", stroke);
        rect.setAttribute("stroke-width", "1.5");
        if (glow !== "none") {
            rect.setAttribute("style", `filter: drop-shadow(${glow});`);
        }
        group.appendChild(rect);
        
        // Text inside node
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", node.x);
        text.setAttribute("y", node.y + 2.5);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "var(--text-primary)");
        text.setAttribute("font-size", "7px");
        text.setAttribute("font-family", "monospace");
        text.setAttribute("font-weight", "600");
        
        // Shorten name if needed, e.g. factorial(4) -> fact(4)
        let displayName = node.name;
        if (displayName.startsWith("factorial")) {
            displayName = displayName.replace("factorial", "fact");
        } else if (displayName.startsWith("sum_n")) {
            displayName = displayName.replace("sum_n", "sum");
        } else if (displayName.startsWith("fibonacci")) {
            displayName = displayName.replace("fibonacci", "fib");
        }
        
        text.textContent = displayName;
        group.appendChild(text);
        
        // Draw Base Case label under the node
        if (node.isBase) {
            const baseText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            baseText.setAttribute("x", node.x);
            baseText.setAttribute("y", node.y + 14);
            baseText.setAttribute("text-anchor", "middle");
            baseText.setAttribute("fill", "var(--accent-green)");
            baseText.setAttribute("font-size", "6px");
            baseText.setAttribute("font-family", "sans-serif");
            baseText.setAttribute("font-weight", "bold");
            baseText.textContent = "★ Base";
            group.appendChild(baseText);
        }
        
        // If node has returned a value, draw a small value badge on top right corner
        if (node.state === "returned" && node.retVal !== null) {
            const badgeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            
            const badgeX = node.x + rectW / 2 - 1;
            const badgeY = node.y - rectH / 2 + 1;
            
            // Badge background circle
            const badgeCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            badgeCircle.setAttribute("cx", badgeX);
            badgeCircle.setAttribute("cy", badgeY);
            badgeCircle.setAttribute("r", "5");
            badgeCircle.setAttribute("fill", "var(--accent-green)");
            badgeGroup.appendChild(badgeCircle);
            
            // Badge text value
            const badgeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            badgeText.setAttribute("x", badgeX);
            badgeText.setAttribute("y", badgeY + 1.8);
            badgeText.setAttribute("text-anchor", "middle");
            badgeText.setAttribute("fill", "#ffffff");
            badgeText.setAttribute("font-size", "6px");
            badgeText.setAttribute("font-family", "sans-serif");
            badgeText.setAttribute("font-weight", "bold");
            badgeText.textContent = node.retVal;
            badgeGroup.appendChild(badgeText);
            
            group.appendChild(badgeGroup);
        }
        
        svg.appendChild(group);
    });
    

}

function highlightCodeLine(lineIdx) {
    const algo = document.getElementById("rec-algorithm").value;
    const rawLines = recCodeTemplate[algo].code.split("\n");
    const container = document.getElementById("visualizer-code-display");
    
    container.innerHTML = "";
    rawLines.forEach((line, idx) => {
        const span = document.createElement("span");
        span.innerHTML = highlightPythonLine(line) + "\n";
        if (idx === lineIdx) {
            span.className = "code-highlight-line";
        }
        container.appendChild(span);
    });
}

// -------------------------------------------------------------
// Module 3: Big-O Curves Visualizer & Benchmarker
// -------------------------------------------------------------
function setupBigOSlider() {
    const slider = document.getElementById("n-slider");
    const valText = document.getElementById("n-val");
    
    slider.addEventListener("input", (e) => {
        const val = parseInt(e.target.value);
        valText.textContent = val;
        updateBigOGraph(val);
    });
}

function updateBigOGraph(N) {
    const svg = document.getElementById("bigo-svg");
    if (!svg) return;
    
    const width = 400;
    const height = 250;
    const originX = 40;
    const originY = 210;
    const chartW = width - originX - 20;
    const chartH = originY - 20;
    
    // Clean interactive indicators first (vertical indicator lines)
    const oldIndicators = svg.querySelectorAll(".indicator-elem");
    oldIndicators.forEach(elem => elem.remove());
    
    // Slider N position
    const sliderPct = (N - 5) / 95;
    const xPos = originX + sliderPct * chartW;
    
    // Create horizontal/vertical reference projection line
    const vLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    vLine.setAttribute("x1", xPos);
    vLine.setAttribute("y1", originY);
    vLine.setAttribute("x2", xPos);
    vLine.setAttribute("y2", 20);
    vLine.setAttribute("stroke", "rgba(255, 255, 255, 0.15)");
    vLine.setAttribute("stroke-dasharray", "4 4");
    vLine.setAttribute("class", "indicator-elem");
    svg.appendChild(vLine);

    // Update the paths dynamically for each complexity
    function generatePath(equation) {
        let pathData = `M ${originX} ${originY}`;
        for (let xVal = 5; xVal <= 100; xVal += 5) {
            const progress = (xVal - 5) / 95;
            const x = originX + progress * chartW;
            const yVal = equation(xVal);
            
            // Cap height to chart boundary
            const y = Math.max(20, originY - yVal * (chartH / 100));
            pathData += ` L ${x} ${y}`;
        }
        return pathData;
    }
    
    // Equations mapping N to chart values (scaled)
    document.getElementById("curve-constant").setAttribute("d", generatePath(n => 5)); // O(1)
    document.getElementById("curve-log").setAttribute("d", generatePath(n => Math.log2(n) * 4)); // O(log N)
    document.getElementById("curve-linear").setAttribute("d", generatePath(n => n * 0.7)); // O(N)
    document.getElementById("curve-nlogn").setAttribute("d", generatePath(n => n * Math.log2(n) * 0.12)); // O(N log N)
    document.getElementById("curve-quadratic").setAttribute("d", generatePath(n => (n * n) * 0.012)); // O(N2)
    
    // Plot intersection dots for visual reference
    const intersectionPoints = [
        { id: "O(1)", val: 5, color: "#10b981" },
        { id: "O(log N)", val: Math.log2(N) * 4, color: "#06b6d4" },
        { id: "O(N)", val: N * 0.7, color: "#3b82f6" },
        { id: "O(N log N)", val: N * Math.log2(N) * 0.12, color: "#a855f7" },
        { id: "O(N²)", val: (N * N) * 0.012, color: "#f43f5e" }
    ];
    
    intersectionPoints.forEach(point => {
        const y = Math.max(20, originY - point.val * (chartH / 100));
        
        // Add glowing point intersection circle
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", xPos);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", 4.5);
        circle.setAttribute("fill", point.color);
        circle.setAttribute("stroke", "#fff");
        circle.setAttribute("stroke-width", 1);
        circle.setAttribute("class", "indicator-elem");
        svg.appendChild(circle);
    });
}

function setupBenchmarker() {
    const runBtn = document.getElementById("run-benchmark-btn");
    runBtn.addEventListener("click", runLiveBenchmark);
}

async function runLiveBenchmark() {
    const benchmarkType = document.getElementById("benchmark-type").value;
    const terminal = document.getElementById("benchmark-terminal");
    const runBtn = document.getElementById("run-benchmark-btn");
    
    if (!pyodideInstance) {
        terminal.textContent = "WASM Python environment is loading, benchmark cannot run yet.";
        return;
    }
    
    runBtn.disabled = true;
    terminal.textContent = `>>> Bootstrapping timeit performance suite...\n>>> Target: ${benchmarkType.toUpperCase()} algorithms\n`;
    
    let pythonScript = "";
    
    // Configure algorithms scripts
    if (benchmarkType === "search") {
        pythonScript = `
import time
import random

# Core algorithms
def linear_search(arr, target):
    for idx, val in enumerate(arr):
        if val == target:
            return idx
    return -1

def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

# Run benchmarks
sizes = [500, 2000, 5000, 10000]
linear_times = []
binary_times = []

for size in sizes:
    arr = list(range(size))
    # We query missing element to trigger worst case behavior
    target = -5 
    
    # Measure Linear Search
    t0 = time.perf_counter()
    for _ in range(50):
        linear_search(arr, target)
    t1 = time.perf_counter()
    linear_times.append((t1 - t0) * 1000 / 50) # Average time in milliseconds
    
    # Measure Binary Search
    t0 = time.perf_counter()
    for _ in range(200):
        binary_search(arr, target)
    t1 = time.perf_counter()
    binary_times.append((t1 - t0) * 1000 / 200)

print(f"LINEAR_BENCH={linear_times}")
print(f"BINARY_BENCH={binary_times}")
`;
    } 
    else if (benchmarkType === "sort") {
        pythonScript = `
import time
import random

def bubble_sort(arr):
    n = len(arr)
    # Shallow copy
    data = list(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if data[j] > data[j+1]:
                data[j], data[j+1] = data[j+1], data[j]
    return data

# Benchmark runs
# Keep sizes smaller for bubble sort to avoid lagging the browser
sizes = [50, 150, 300, 500] 
bubble_times = []
timsort_times = []

for size in sizes:
    # Average over 5 random runs
    b_acc = 0
    t_acc = 0
    for _ in range(3):
        arr = [random.randint(1, 10000) for _ in range(size)]
        
        # Bubble
        t0 = time.perf_counter()
        bubble_sort(arr)
        t1 = time.perf_counter()
        b_acc += (t1 - t0) * 1000
        
        # Timsort
        t0 = time.perf_counter()
        sorted(arr)
        t1 = time.perf_counter()
        t_acc += (t1 - t0) * 1000
        
    bubble_times.append(b_acc / 3)
    timsort_times.append(t_acc / 3)

print(f"BUBBLE_BENCH={bubble_times}")
print(f"TIMSORT_BENCH={timsort_times}")
`;
    }
    
    // Execute python script
    terminal.textContent += `>>> Running iterations on sizes...\n`;
    
    const response = await runPythonCode(pythonScript);
    terminal.textContent += response;
    
    // Parse benchmark results from outputs
    let results = { path1: [], path2: [] };
    let sizesUsed = [];
    
    if (benchmarkType === "search") {
        sizesUsed = [500, 2000, 5000, 10000];
        const linMatch = response.match(/LINEAR_BENCH=\[(.*?)\]/);
        const binMatch = response.match(/BINARY_BENCH=\[(.*?)\]/);
        
        if (linMatch && binMatch) {
            results.path1 = linMatch[1].split(',').map(Number);
            results.path2 = binMatch[1].split(',').map(Number);
        }
        
        plotEmpiricalGraph(sizesUsed, results.path1, results.path2, "Linear Search O(N)", "Binary Search O(log N)");
    } 
    else if (benchmarkType === "sort") {
        sizesUsed = [50, 150, 300, 500];
        const bubbleMatch = response.match(/BUBBLE_BENCH=\[(.*?)\]/);
        const timMatch = response.match(/TIMSORT_BENCH=\[(.*?)\]/);
        
        if (bubbleMatch && timMatch) {
            results.path1 = bubbleMatch[1].split(',').map(Number);
            results.path2 = timMatch[1].split(',').map(Number);
        }
        
        plotEmpiricalGraph(sizesUsed, results.path1, results.path2, "Bubble Sort O(N²)", "Built-in Sort O(N log N)");
    }
    
    runBtn.disabled = false;
}

function plotEmpiricalGraph(sizes, times1, times2, label1, label2) {
    const svg = document.getElementById("empirical-svg");
    const path1 = document.getElementById("emp-path-1");
    const path2 = document.getElementById("emp-path-2");
    
    // Update legend titles
    document.getElementById("emp-legend-lbl1").textContent = label1;
    document.getElementById("emp-legend-lbl2").textContent = label2;
    
    if (!times1 || !times2 || times1.length === 0) return;
    
    const width = 400;
    const height = 220;
    const originX = 40;
    const originY = 180;
    const chartW = width - originX - 20;
    const chartH = originY - 20;
    
    // Clean old data points first
    const oldDots = svg.querySelectorAll(".bench-dot");
    oldDots.forEach(d => d.remove());
    
    // Scale max height based on worst timings
    const maxTime = Math.max(...times1, ...times2, 0.001); 
    const minSize = sizes[0];
    const maxSize = sizes[sizes.length - 1];
    
    function scaleX(size) {
        return originX + ((size - minSize) / (maxSize - minSize)) * chartW;
    }
    
    function scaleY(time) {
        return originY - (time / maxTime) * chartH;
    }
    
    // Draw paths
    let p1Data = `M ${scaleX(sizes[0])} ${scaleY(times1[0])}`;
    let p2Data = `M ${scaleX(sizes[0])} ${scaleY(times2[0])}`;
    
    for (let i = 0; i < sizes.length; i++) {
        const x = scaleX(sizes[i]);
        const y1 = scaleY(times1[i]);
        const y2 = scaleY(times2[i]);
        
        if (i > 0) {
            p1Data += ` L ${x} ${y1}`;
            p2Data += ` L ${x} ${y2}`;
        }
        
        // Draw actual data dots on plot
        const dot1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot1.setAttribute("cx", x);
        dot1.setAttribute("cy", y1);
        dot1.setAttribute("r", 4);
        dot1.setAttribute("fill", "#f43f5e");
        dot1.setAttribute("class", "bench-dot");
        
        const dot2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot2.setAttribute("cx", x);
        dot2.setAttribute("cy", y2);
        dot2.setAttribute("r", 4);
        dot2.setAttribute("fill", "#10b981");
        dot2.setAttribute("class", "bench-dot");
        
        svg.appendChild(dot1);
        svg.appendChild(dot2);
    }
    
    path1.setAttribute("d", p1Data);
    path2.setAttribute("d", p2Data);
}

// -------------------------------------------------------------
// Module 5: Interactive Quiz Mechanics
// -------------------------------------------------------------
const quizQuestions = [
    {
        num: 1,
        question: "In Python, which of the following is MUTABLE (can be modified directly in place after creation)?",
        options: [
            "A string: s = 'Hello'",
            "A tuple: point = (10, 20)",
            "A list: values = [1, 2, 3]",
            "An integer: count = 42"
        ],
        answer: 2, // list
        explanation: "Lists are dynamic mutable arrays. Under the hood, Python lists can grow and update values dynamically. In contrast, strings, tuples, and numeric values are immutable; any 'modification' operation actually creates a new object in memory."
    },
    {
        num: 2,
        question: "In Python, strings are immutable. What happens if you run the statements `s = 'Hello'` and then attempt to modify its first character using `s[0] = 'h'`?",
        options: [
            "It raises a `TypeError` because string objects do not support element assignment",
            "It successfully modifies `s` to `'hello'` in-place",
            "It creates a completely new string in-place with no error",
            "It automatically converts `s` into a mutable List object"
        ],
        answer: 0,
        explanation: "Correct! Python strings are immutable sequences. You cannot modify their elements directly. Attempting to assign a new value to an index (e.g. `s[0] = 'h'`) throws a `TypeError` (as demonstrated in the Collections Explorer). To change characters, you must construct a new string."
    },
    {
        num: 3,
        question: "How does the Python range loop `for i in range(5):` behave compared to C's `for(int i = 0; i < 5; i++)`?",
        options: [
            "It loops `i` from `0` to `4` (performing exactly 5 iterations)",
            "It loops `i` from `0` to `5` (performing 6 iterations)",
            "It loops `i` from `1` to `5` (performing 5 iterations)",
            "It requires declaring the variable type of `i` before execution"
        ],
        answer: 0,
        explanation: "Bingo! In Python, `range(5)` yields integers from `0` up to (but not including) `5` (i.e. `0, 1, 2, 3, 4`). This performs exactly 5 iterations, matching the standard counting loop behavior from C."
    },
    {
        num: 4,
        question: "How does Python handle memory freeing of objects that are no longer needed, compared to C's free() function?",
        options: [
            "Python doesn't free memory, causing major leaks unless sys.exit() is called",
            "The developer must explicitly write del(obj) to release RAM",
            "Python uses automatic Garbage Collection (via reference counting and generational cycles)",
            "Python requires placing functions in try-finally blocks to clean heap structures"
        ],
        answer: 2, // Garbage collection
        explanation: "Python handles memory management dynamically. It tracks the reference count of variables pointing to an object. When an object's reference count drops to 0 (meaning nothing references it), Python's GC automatically reclaims its memory, protecting you from manual leaks."
    },
    {
        num: 5,
        question: "What syntactic rule is mandatory to define a block of code (like loops or condition branches) in Python?",
        options: [
            "Enclosing statements inside curly brackets {}",
            "Ending every statement with a semicolon ;",
            "Consistent indentation levels (typically 4 spaces) after a colon symbol :",
            "Capitalizing keywords like FOR, WHILE, and IF"
        ],
        answer: 2, // Indentation
        explanation: "Python abandons curly braces and semicolons completely. Stating a colon ':' tells Python a sub-block is beginning, and the subsequent lines must share the exact indentation level. Mixing tabs and spaces yields IndentationError!"
    }
];

let currentQuizIdx = 0;
let userAnswers = Array(quizQuestions.length).fill(null);

function loadQuizQuestion() {
    const container = document.getElementById("quiz-container");
    if (!container) return;
    
    if (currentQuizIdx >= quizQuestions.length) {
        showQuizResults();
        return;
    }
    
    const q = quizQuestions[currentQuizIdx];
    const prevAnswer = userAnswers[currentQuizIdx];
    const isAnswered = (prevAnswer !== null);
    
    container.innerHTML = `
        <div class="quiz-question-card glass">
            <div class="quiz-q-num">Question ${q.num} of ${quizQuestions.length}</div>
            <div class="quiz-q-text">${q.question}</div>
            <div class="quiz-options">
                ${q.options.map((opt, i) => {
                    let extraClass = "";
                    if (isAnswered) {
                        if (i === q.answer) {
                            extraClass = " correct";
                        } else if (i === prevAnswer) {
                            extraClass = " incorrect";
                        }
                    }
                    return `<button class="quiz-option${extraClass}" ${isAnswered ? 'disabled' : ''} onclick="selectQuizOption(${i})">${opt}</button>`;
                }).join('')}
            </div>
            <div class="quiz-explanation ${isAnswered ? (prevAnswer === q.answer ? 'correct-explain' : 'incorrect-explain') : ''}" id="quiz-explanation-box" style="display: ${isAnswered ? 'block' : 'none'};">
                ${isAnswered ? `
                    <h5 class="${prevAnswer === q.answer ? 'correct-title' : 'incorrect-title'}">
                        <i class="fa-solid ${prevAnswer === q.answer ? 'fa-circle-check' : 'fa-circle-xmark'}"></i> 
                        ${prevAnswer === q.answer ? 'Correct!' : 'Incorrect'}
                    </h5>
                    <p>${q.explanation}</p>
                ` : ''}
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 16px; align-items: center; width: 100%;">
                <div>
                    ${currentQuizIdx > 0 ? `<button class="btn btn-secondary" id="quiz-prev-btn" onclick="prevQuizQuestion()"><i class="fa-solid fa-chevron-left"></i> Back</button>` : ''}
                </div>
                <div>
                    <button class="btn btn-primary" id="quiz-next-btn" style="display: ${isAnswered ? 'inline-flex' : 'none'};" onclick="nextQuizQuestion()">Next Question <i class="fa-solid fa-chevron-right"></i></button>
                </div>
            </div>
        </div>
    `;
}

function selectQuizOption(optionIdx) {
    const q = quizQuestions[currentQuizIdx];
    const options = document.querySelectorAll(".quiz-option");
    
    // Disable all options from clicks
    options.forEach(opt => opt.disabled = true);
    
    // Mark selection
    userAnswers[currentQuizIdx] = optionIdx;
    
    const isCorrect = (optionIdx === q.answer);
    
    // Set styles
    options.forEach((opt, idx) => {
        if (idx === q.answer) {
            opt.classList.add("correct");
        } else if (idx === optionIdx) {
            opt.classList.add("incorrect");
        }
    });
    
    // Render explanation
    const explainBox = document.getElementById("quiz-explanation-box");
    explainBox.style.display = "block";
    if (isCorrect) {
        explainBox.className = "quiz-explanation correct-explain";
        explainBox.innerHTML = `
            <h5 class="correct-title"><i class="fa-solid fa-circle-check"></i> Correct!</h5>
            <p>${q.explanation}</p>
        `;
    } else {
        explainBox.className = "quiz-explanation incorrect-explain";
        explainBox.innerHTML = `
            <h5 class="incorrect-title"><i class="fa-solid fa-circle-xmark"></i> Incorrect</h5>
            <p>${q.explanation}</p>
        `;
    }
    
    // Show Next Button
    document.getElementById("quiz-next-btn").style.display = "inline-flex";
}

function nextQuizQuestion() {
    currentQuizIdx++;
    loadQuizQuestion();
}

function prevQuizQuestion() {
    if (currentQuizIdx > 0) {
        currentQuizIdx--;
        loadQuizQuestion();
    }
}

window.prevQuizQuestion = prevQuizQuestion;
window.selectQuizOption = selectQuizOption;
window.nextQuizQuestion = nextQuizQuestion;
window.resetQuiz = resetQuiz;

function showQuizResults() {
    const container = document.getElementById("quiz-container");
    container.style.display = "none";
    
    const summaryCard = document.getElementById("quiz-summary-card");
    summaryCard.style.display = "flex";
    
    // Compute Score
    let score = 0;
    userAnswers.forEach((ans, idx) => {
        if (ans === quizQuestions[idx].answer) {
            score++;
        }
    });
    
    document.getElementById("quiz-score-num").textContent = score;
    document.getElementById("quiz-score-total").textContent = quizQuestions.length;
    
    const fbText = document.getElementById("quiz-feedback-text");
    if (score === quizQuestions.length) {
        fbText.textContent = "Spectacular! You are fully prepared to teach the DSA curriculum in Python. You've mastered C to Python syntax structures!";
    } else if (score >= 3) {
        fbText.textContent = "Great job! You have a solid grasp of structural changes. Read the feedback answers to perfect your knowledge.";
    } else {
        fbText.textContent = "Keep reviewing! Understanding memory paradigms (GC, structures, pointers vs self) is essential when shifting to Python.";
    }
}

function resetQuiz() {
    currentQuizIdx = 0;
    userAnswers = Array(quizQuestions.length).fill(null);
    
    document.getElementById("quiz-summary-card").style.display = "none";
    const container = document.getElementById("quiz-container");
    container.style.display = "block";
    
    loadQuizQuestion();
}

// Global handler to run live code snippets in Pyodide
async function runLiveCode(textareaId, outputId) {
    const textarea = document.getElementById(textareaId);
    const output = document.getElementById(outputId);
    if (!textarea || !output) return;
    
    output.textContent = "Running code in WebAssembly Python environment...\n";
    output.className = "live-code-output running";
    
    // We reuse the page's runPythonCode helper
    const result = await runPythonCode(textarea.value);
    output.textContent = result || "Execution finished (no printed output).";
    output.className = "live-code-output success";
}

function setupWhyPythonSimulators() {
    // Helper to update Python dynamic memory row
    function updatePythonMemory(count) {
        const pyRow = document.getElementById("mem-py-row");
        const capBadge = document.getElementById("py-mem-cap-badge");
        if (!pyRow) return;

        // CPython dynamic array over-allocation pattern:
        // Size 0 -> Capacity 0
        // Size 1-4 -> Capacity 4
        // Size 5-8 -> Capacity 8
        // Size 9-16 -> Capacity 16
        let capacity = 0;
        if (count > 0 && count <= 4) capacity = 4;
        else if (count >= 5 && count <= 8) capacity = 8;
        else if (count >= 9) capacity = 16;

        if (capBadge) capBadge.textContent = `Capacity: ${capacity}`;

        pyRow.innerHTML = "";
        for (let i = 0; i < capacity; i++) {
            const cell = document.createElement("div");
            cell.className = "mem-cell";
            if (i < count) {
                cell.classList.add("filled");
                cell.innerHTML = `<i class="fa-brands fa-python" style="color: var(--accent-blue); font-size: 1.1rem;"></i>`;
            } else {
                cell.innerHTML = `<small style="font-size: 8px; color: var(--text-muted); font-weight: 500;">Alloc</small>`;
            }
            pyRow.appendChild(cell);
        }
    }

    // 1. Memory Resizer Simulator
    let memCount = 0;
    const appendBtn = document.getElementById("append-mem-btn");
    const resetBtn = document.getElementById("reset-mem-btn");
    const memStatusText = document.getElementById("mem-status-text");
    const newRowLabel = document.getElementById("new-row-label");
    const memNewRow = document.getElementById("mem-new-row");

    if (appendBtn && resetBtn) {
        // Initialize Python memory row
        updatePythonMemory(0);

        appendBtn.addEventListener("click", () => {
            if (memCount < 5) {
                const cell = document.getElementById(`old-cell-${memCount}`);
                if (cell) {
                    cell.classList.add("filled");
                    cell.innerHTML = `<i class="fa-solid fa-circle-nodes" style="color: var(--accent-blue);"></i>`;
                }
                memCount++;
                updatePythonMemory(memCount); // Python updates instantly
                memStatusText.innerHTML = `C array element added at index ${memCount - 1}. Space: <strong>${memCount}/5</strong> slots used.`;
            } else if (memCount === 5) {
                appendBtn.disabled = true;
                if (newRowLabel && memNewRow) {
                    newRowLabel.style.display = "block";
                    memNewRow.style.display = "flex";
                }
                memStatusText.innerHTML = `<span style="color: var(--accent-red);"><i class="fa-solid fa-triangle-exclamation"></i> C Array overflow! Allocating new block of size 10...</span>`;
                
                // Python resizes and appends elements instantly
                updatePythonMemory(6);

                // Animate reallocation for C
                setTimeout(() => {
                    memStatusText.innerHTML = `<span style="color: var(--accent-orange);"><i class="fa-solid fa-arrows-rotate fa-spin"></i> Copying 5 elements to new C block...</span>`;
                    for (let i = 0; i < 5; i++) {
                        const oldCell = document.getElementById(`old-cell-${i}`);
                        const newCell = document.getElementById(`new-cell-${i}`);
                        if (oldCell && newCell) {
                            oldCell.classList.remove("filled");
                            oldCell.classList.add("reallocated");
                            newCell.classList.add("reallocated");
                            newCell.innerHTML = `<i class="fa-solid fa-circle-nodes" style="color: var(--accent-green);"></i>`;
                        }
                    }
                }, 2000);

                setTimeout(() => {
                    memStatusText.innerHTML = `<span style="color: var(--accent-red);"><i class="fa-solid fa-trash"></i> Freeing old C buffer block...</span>`;
                    for (let i = 0; i < 5; i++) {
                        const oldCell = document.getElementById(`old-cell-${i}`);
                        if (oldCell) {
                            oldCell.innerHTML = i;
                            oldCell.classList.remove("reallocated");
                        }
                    }
                }, 4500);

                setTimeout(() => {
                    const newCell = document.getElementById(`new-cell-5`);
                    if (newCell) {
                        newCell.classList.add("filled");
                        newCell.innerHTML = `<i class="fa-solid fa-circle-nodes" style="color: var(--accent-blue);"></i>`;
                    }
                    memStatusText.innerHTML = `<span style="color: var(--accent-green);"><i class="fa-solid fa-circle-check"></i> Reallocation done! Appended 6th element. C used: <strong>6/10</strong> slots.</span><br><small style="color: var(--accent-blue); font-weight: 600;">Python: Resizing is automatic under the hood. Developer just writes list.append()!</small>`;
                    appendBtn.disabled = false;
                    memCount++;
                }, 7000);
            } else if (memCount >= 6 && memCount < 10) {
                const cell = document.getElementById(`new-cell-${memCount}`);
                if (cell) {
                    cell.classList.add("filled");
                    cell.innerHTML = `<i class="fa-solid fa-circle-nodes" style="color: var(--accent-blue);"></i>`;
                }
                memCount++;
                updatePythonMemory(memCount); // Python updates instantly
                memStatusText.innerHTML = `Appended element in reallocated C buffer at index ${memCount - 1}. Space: <strong>${memCount}/10</strong> slots used.`;
            } else if (memCount === 10) {
                memStatusText.innerHTML = `<span style="color: var(--accent-red);"><i class="fa-solid fa-triangle-exclamation"></i> Reallocated C buffer is full! C needs another reallocation. Python is still automatic.</span>`;
            }
        });

        resetBtn.addEventListener("click", () => {
            memCount = 0;
            memStatusText.innerHTML = `Buffer is empty. Add elements to fill the memory slots.`;
            if (newRowLabel && memNewRow) {
                newRowLabel.style.display = "none";
                memNewRow.style.display = "none";
            }
            for (let i = 0; i < 5; i++) {
                const cell = document.getElementById(`old-cell-${i}`);
                if (cell) {
                    cell.className = "mem-cell";
                    cell.textContent = i;
                }
            }
            for (let i = 0; i < 10; i++) {
                const cell = document.getElementById(`new-cell-${i}`);
                if (cell) {
                    cell.className = "mem-cell";
                    cell.textContent = i;
                }
            }
            updatePythonMemory(0);
        });
    }

    // 2. Hash Map Simulator
    const lookupHashBtn = document.getElementById("lookup-hash-btn");
    const hashNameSelect = document.getElementById("hash-name-select");
    const hashStatusText = document.getElementById("hash-status-text");

    if (lookupHashBtn && hashNameSelect) {
        lookupHashBtn.addEventListener("click", () => {
            const name = hashNameSelect.value;
            const nodes = document.querySelectorAll(".hash-node");
            const arrow = document.getElementById("arrow-David");
            const pyRows = document.querySelectorAll(".py-dict-row");
            
            // Clear highlights
            nodes.forEach(n => n.className = "hash-node");
            if (arrow) arrow.style.display = "none";
            pyRows.forEach(r => r.className = "py-dict-row");
            
            hashStatusText.innerHTML = `Computing hash for "${name}"...`;
            
            if (name === "Alice") {
                const node = document.getElementById("node-Alice");
                const pyRow = document.getElementById("py-dict-Alice");
                if (node && pyRow) {
                    node.classList.add("active-search");
                    pyRow.classList.add("active-search");
                    setTimeout(() => {
                        node.classList.remove("active-search");
                        node.classList.add("found");
                        pyRow.classList.remove("active-search");
                        pyRow.classList.add("found");
                        hashStatusText.innerHTML = `<strong>C Table Trace:</strong> Hash("Alice") % 5 = <strong>Bucket 1</strong>. First node matches key "Alice". Found Value: <strong>A</strong>.<br><small style="color: var(--accent-blue); font-weight:600;">Python: grades["Alice"] -> returns "A" instantly in average O(1) from flat memory.</small>`;
                    }, 600);
                }
            } else if (name === "David") {
                const nodeAlice = document.getElementById("node-Alice");
                const nodeDavid = document.getElementById("node-David");
                const pyRowAlice = document.getElementById("py-dict-Alice");
                const pyRowDavid = document.getElementById("py-dict-David");

                if (nodeAlice && nodeDavid && pyRowAlice && pyRowDavid) {
                    nodeAlice.classList.add("active-search");
                    pyRowAlice.classList.add("active-search");
                    hashStatusText.innerHTML = `<strong>C Table Trace:</strong> Hash("David") % 5 = <strong>Bucket 1</strong>. Bucket 1 head is "Alice" (Mismatch). Collision!`;
                    
                    setTimeout(() => {
                        nodeAlice.classList.remove("active-search");
                        pyRowAlice.classList.remove("active-search");
                        if (arrow) arrow.style.display = "inline-block";
                        nodeDavid.classList.add("active-search");
                        pyRowDavid.classList.add("active-search");
                        hashStatusText.innerHTML = `<strong>C Table Trace:</strong> Hash("David") % 5 = Bucket 1. Traversing collision link pointer to "David" (Match!). Found Value: <strong>B+</strong>.`;
                    }, 1000);
                    
                    setTimeout(() => {
                        nodeDavid.classList.remove("active-search");
                        nodeDavid.classList.add("found");
                        pyRowDavid.classList.remove("active-search");
                        pyRowDavid.classList.add("found");
                        hashStatusText.innerHTML = `<strong>C Table Trace:</strong> Found Value: <strong>B+</strong>. Collisions require linked list pointer chasing.<br><small style="color: var(--accent-blue); font-weight:600;">Python: grades["David"] -> returns "B+" in average O(1) automatically resolving collision (Probing index 2).</small>`;
                    }, 2000);
                }
            } else if (name === "Bob") {
                const node = document.getElementById("node-Bob");
                const pyRow = document.getElementById("py-dict-Bob");
                if (node && pyRow) {
                    node.classList.add("active-search");
                    pyRow.classList.add("active-search");
                    setTimeout(() => {
                        node.classList.remove("active-search");
                        node.classList.add("found");
                        pyRow.classList.remove("active-search");
                        pyRow.classList.add("found");
                        hashStatusText.innerHTML = `<strong>C Table Trace:</strong> Hash("Bob") % 5 = <strong>Bucket 3</strong>. First node matches key "Bob". Found Value: <strong>B</strong>.`;
                    }, 600);
                }
            } else if (name === "Charlie") {
                const node = document.getElementById("node-Charlie");
                const pyRow = document.getElementById("py-dict-Charlie");
                if (node && pyRow) {
                    node.classList.add("active-search");
                    pyRow.classList.add("active-search");
                    setTimeout(() => {
                        node.classList.remove("active-search");
                        node.classList.add("found");
                        pyRow.classList.remove("active-search");
                        pyRow.classList.add("found");
                        hashStatusText.innerHTML = `<strong>C Table Trace:</strong> Hash("Charlie") % 5 = <strong>Bucket 4</strong>. First node matches key "Charlie". Found Value: <strong>C</strong>.`;
                    }, 600);
                }
            }
        });
    }

    // 3. Array Slicing Simulator
    const startSlider = document.getElementById("slice-start-slider");
    const endSlider = document.getElementById("slice-end-slider");
    const lblStartIdx = document.getElementById("lbl-start-idx");
    const lblEndIdx = document.getElementById("lbl-end-idx");
    const cSliceCode = document.getElementById("c-slice-code");
    const sliceStatusText = document.getElementById("slice-status-text");

    const arrValues = [10, 20, 30, 40, 50, 60, 70, 80];

    const updateSlicer = () => {
        let start = parseInt(startSlider.value);
        let end = parseInt(endSlider.value);

        if (start >= end) {
            start = end - 1;
            startSlider.value = start;
        }

        lblStartIdx.textContent = start;
        lblEndIdx.textContent = end;

        // Highlight cells
        const slicedVals = [];
        for (let i = 0; i < 8; i++) {
            const cell = document.getElementById(`slice-cell-${i}`);
            if (cell) {
                if (i >= start && i < end) {
                    cell.classList.add("highlighted");
                    slicedVals.push(arrValues[i]);
                } else {
                    cell.classList.remove("highlighted");
                }
            }
        }

        // Update code snippets
        cSliceCode.innerHTML = `// Slice array indices ${start} to ${end} (${end - start} elements)
int slice[${end - start}];
int count = 0;
for(int i = ${start}; i &lt; ${end}; i++) {
    slice[count++] = arr[i];
}`;

        // Update the Python Live Slicing Textarea dynamically
        const readabilityPyCode = document.getElementById("readability-py-code");
        if (readabilityPyCode) {
            readabilityPyCode.value = `# Slice indices ${start} to ${end} instantly
arr = [10, 20, 30, 40, 50, 60, 70, 80]
slice_arr = arr[${start}:${end}]
print("Sliced Array:", slice_arr)`;
        }

        sliceStatusText.innerHTML = `Result sliced array: <strong>[${slicedVals.join(', ')}]</strong>`;
    };

    if (startSlider && endSlider) {
        startSlider.addEventListener("input", updateSlicer);
        endSlider.addEventListener("input", updateSlicer);
        updateSlicer();
    }
}
// -------------------------------------------------------------
// Module 1: Python Dynamic Typing Step-by-Step Visualizer
// -------------------------------------------------------------
let currentTypingStep = 0;

const typingSteps = [
    {
        line: 0,
        explanation: "Click <strong>Next Step</strong> to execute the first line (<code>age = 20</code>)",
        variables: [],
        objects: [],
        links: []
    },
    {
        line: 1,
        explanation: "<strong>Line 1 (age = 20):</strong> Python creates an Integer Object on the heap with the value of <code>20</code>, and binds the name label (variable) <code>age</code> to point to it. (Note that in C, variables behave like fixed-size boxes containing the value directly).",
        variables: [
            { id: "var-age", name: "age" }
        ],
        objects: [
            { id: "obj-20", type: "int", val: "20", refs: 1 }
        ],
        links: [
            { from: "var-age", to: "obj-20", marker: "marker-arrow" }
        ]
    },
    {
        line: 2,
        explanation: "<strong>Line 2 (gpa = 3.85):</strong> Python instantiates a Float Object on the heap holding the value <code>3.85</code> and creates the label reference <code>gpa</code> pointing to it. No type declaration is required due to dynamic typing.",
        variables: [
            { id: "var-age", name: "age" },
            { id: "var-gpa", name: "gpa" }
        ],
        objects: [
            { id: "obj-20", type: "int", val: "20", refs: 1 },
            { id: "obj-385", type: "float", val: "3.85", refs: 1 }
        ],
        links: [
            { from: "var-age", to: "obj-20", marker: "marker-arrow" },
            { from: "var-gpa", to: "obj-385", marker: "marker-arrow-cyan" }
        ]
    },
    {
        line: 3,
        explanation: "<strong>Line 3 (grade = 'A'):</strong> Python instantiates a String Object with the value <code>'A'</code> on the heap and creates a reference label <code>grade</code> pointing to it. Everything in Python is treated as an Object.",
        variables: [
            { id: "var-age", name: "age" },
            { id: "var-gpa", name: "gpa" },
            { id: "var-grade", name: "grade" }
        ],
        objects: [
            { id: "obj-20", type: "int", val: "20", refs: 1 },
            { id: "obj-385", type: "float", val: "3.85", refs: 1 },
            { id: "obj-a", type: "str", val: "'A'", refs: 1 }
        ],
        links: [
            { from: "var-age", to: "obj-20", marker: "marker-arrow" },
            { from: "var-gpa", to: "obj-385", marker: "marker-arrow-cyan" },
            { from: "var-grade", to: "obj-a", marker: "marker-arrow-purple" }
        ]
    },
    {
        line: 4,
        explanation: "<strong>Line 4 (age = 'twenty') *Reference Rebinding*:</strong> Python instantiates a new String Object containing <code>'twenty'</code> and rebinds the label <code>age</code> to point to this new object instead. The old integer object <code>20</code> now has a Reference Count of 0 (orphaned) and will be collected by Python's Garbage Collector.",
        variables: [
            { id: "var-age", name: "age" },
            { id: "var-gpa", name: "gpa" },
            { id: "var-grade", name: "grade" }
        ],
        objects: [
            { id: "obj-20", type: "int", val: "20", refs: 0, orphan: true },
            { id: "obj-385", type: "float", val: "3.85", refs: 1 },
            { id: "obj-a", type: "str", val: "'A'", refs: 1 },
            { id: "obj-twenty", type: "str", val: "'twenty'", refs: 1 }
        ],
        links: [
            { from: "var-age", to: "obj-twenty", marker: "marker-arrow-orange" },
            { from: "var-gpa", to: "obj-385", marker: "marker-arrow-cyan" },
            { from: "var-grade", to: "obj-a", marker: "marker-arrow-purple" }
        ]
    }
];

function setupDynamicTypingVisualizer() {
    const prevBtn = document.getElementById("typing-prev-btn");
    const nextBtn = document.getElementById("typing-next-btn");
    const resetBtn = document.getElementById("typing-reset-btn");
    
    if (!prevBtn || !nextBtn || !resetBtn) return;
    
    prevBtn.addEventListener("click", () => {
        if (currentTypingStep > 0) {
            currentTypingStep--;
            renderTypingStep();
        }
    });
    
    nextBtn.addEventListener("click", () => {
        if (currentTypingStep < typingSteps.length - 1) {
            currentTypingStep++;
            renderTypingStep();
        }
    });
    
    resetBtn.addEventListener("click", () => {
        currentTypingStep = 0;
        renderTypingStep();
    });
    
    // Add window resize trigger to recalculate line coords
    window.addEventListener("resize", () => {
        if (document.getElementById("dynamic-typing-visualizer-section")) {
            updateTypingConnections();
        }
    });

    renderTypingStep();
}

function getStrokeColorForMarker(markerId) {
    switch (markerId) {
        case "marker-arrow": return "var(--accent-blue, #3b82f6)";
        case "marker-arrow-cyan": return "var(--accent-cyan, #06b6d4)";
        case "marker-arrow-purple": return "var(--accent-purple, #a855f7)";
        case "marker-arrow-green": return "var(--accent-green, #10b981)";
        case "marker-arrow-orange": return "var(--accent-orange, #f97316)";
        default: return "#3b82f6";
    }
}

function updateTypingConnections() {
    const svg = document.getElementById("dynamic-connections-svg");
    if (!svg) return;
    
    // Clear old path lines
    const oldPaths = svg.querySelectorAll("path");
    oldPaths.forEach(path => path.remove());
    
    const containerRect = svg.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return; // container hidden
    
    const activeStep = typingSteps[currentTypingStep];
    activeStep.links.forEach(link => {
        const fromEl = document.getElementById(link.from);
        const toEl = document.getElementById(link.to);
        
        if (fromEl && toEl) {
            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();
            
            // From middle right of the variable tag
            const x1 = fromRect.right - containerRect.left;
            const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;
            
            // To middle left of the heap object card
            const x2 = toRect.left - containerRect.left;
            const y2 = toRect.top + toRect.height / 2 - containerRect.top;
            
            // Bezier curve control points
            const dx = Math.abs(x2 - x1) * 0.4;
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
            path.setAttribute("stroke", getStrokeColorForMarker(link.marker));
            path.setAttribute("stroke-width", "2.5");
            path.setAttribute("fill", "none");
            path.setAttribute("marker-end", `url(#${link.marker})`);
            
            svg.appendChild(path);
        }
    });
}

function renderTypingStep() {
    const prevBtn = document.getElementById("typing-prev-btn");
    const nextBtn = document.getElementById("typing-next-btn");
    const explanationBox = document.getElementById("typing-explanation-box");
    const namespaceCol = document.getElementById("namespace-tags-col");
    const heapCol = document.getElementById("heap-cards-col");
    
    if (!namespaceCol || !heapCol || !explanationBox) return;
    
    const activeStep = typingSteps[currentTypingStep];
    
    // Enable/disable navigation buttons
    prevBtn.disabled = (currentTypingStep === 0);
    nextBtn.disabled = (currentTypingStep === typingSteps.length - 1);
    
    // 1. Update Code Highlights
    for (let i = 1; i <= 4; i++) {
        const lineDiv = document.getElementById(`v-line-${i}`);
        if (lineDiv) {
            if (i === activeStep.line) {
                lineDiv.classList.add("active");
            } else {
                lineDiv.classList.remove("active");
            }
        }
    }
    
    // 2. Update Explanation
    explanationBox.innerHTML = activeStep.explanation;
    if (currentTypingStep === 4) {
        explanationBox.style.borderLeftColor = "var(--accent-orange)";
    } else {
        explanationBox.style.borderLeftColor = "var(--accent-blue)";
    }
    
    // 3. Render Variables
    namespaceCol.innerHTML = "";
    activeStep.variables.forEach(v => {
        const varDiv = document.createElement("div");
        varDiv.className = "var-tag";
        varDiv.id = v.id;
        
        let borderRightColor = "var(--accent-blue)";
        if (v.name === "gpa") borderRightColor = "var(--accent-cyan)";
        if (v.name === "grade") borderRightColor = "var(--accent-purple)";
        if (v.name === "age" && currentTypingStep === 4) borderRightColor = "var(--accent-orange)";
        
        varDiv.style.borderRightColor = borderRightColor;
        varDiv.innerHTML = `
            <span>${v.name}</span>
            <i class="fa-solid fa-link" style="font-size: 10px; opacity: 0.7;"></i>
        `;
        namespaceCol.appendChild(varDiv);
    });
    
    // 4. Render Heap Objects
    heapCol.innerHTML = "";
    activeStep.objects.forEach(obj => {
        const objDiv = document.createElement("div");
        objDiv.className = "heap-obj-card";
        if (obj.orphan) objDiv.classList.add("orphan");
        objDiv.id = obj.id;
        
        let typeColor = "var(--accent-blue)";
        if (obj.type === "float") typeColor = "var(--accent-cyan)";
        if (obj.type === "str") typeColor = "var(--accent-purple)";
        if (obj.type === "str" && obj.val === "'twenty'") typeColor = "var(--accent-orange)";
        
        objDiv.innerHTML = `
            <div class="heap-obj-type" style="color: ${typeColor};">${obj.type}</div>
            <div class="heap-obj-val">${obj.val}</div>
            <div class="heap-obj-ref">
                <span>Ref Count:</span>
                <strong style="color: ${obj.refs > 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">${obj.refs}</strong>
            </div>
        `;
        heapCol.appendChild(objDiv);
    });
    
    // 5. Redraw Connections (with a tiny timeout to ensure browser paints first)
    setTimeout(updateTypingConnections, 50);
}

// -------------------------------------------------------------
// Module 1: Python Collections Explorer Visualizer
// -------------------------------------------------------------
let colActiveTab = "list";
let colListState = ["apple", "banana", "cherry"];
let colTupleState = [10, 20, 30];
let colDictState = { name: "Alice", role: "admin" };
let colStrState = "Hello";

function setupCollectionsExplorer() {
    const tabs = document.querySelectorAll(".explorer-tab-btn");
    
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            colActiveTab = tab.getAttribute("data-type");
            resetCollectionExplorerStates();
            renderCollectionExplorer();
        });
    });
    
    // Reset Button logic
    const resetBtn = document.getElementById("explorer-reset-btn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            resetCollectionExplorerStates();
            renderCollectionExplorer();
            const explanationBox = document.getElementById("explorer-explanation-box");
            if (explanationBox) {
                explanationBox.innerHTML = `<span style="color: var(--accent-purple); font-weight:600;"><i class="fa-solid fa-rotate-left"></i> Explorer states reset back to initial values!</span>`;
            }
        });
    }
    
    // Initial Render
    resetCollectionExplorerStates();
    renderCollectionExplorer();
}

function resetCollectionExplorerStates() {
    colListState = ["apple", "banana", "cherry"];
    colTupleState = [10, 20, 30];
    colDictState = { name: "Alice", role: "admin" };
    colStrState = "Hello";
    
    const statementCode = document.getElementById("explorer-statement-code");
    if (statementCode) {
        statementCode.innerHTML = highlightPythonSyntax(`# Initializing collection:\n${getInitialStatement()}`);
    }
    
    const explanationBox = document.getElementById("explorer-explanation-box");
    if (explanationBox) {
        explanationBox.innerHTML = `Select an action button to perform operations on the Python <strong>${colActiveTab}</strong> object.`;
        explanationBox.style.borderLeftColor = "var(--accent-purple)";
    }
}

function getInitialStatement() {
    switch (colActiveTab) {
        case "list": return 'fruits = ["apple", "banana", "cherry"]';
        case "tuple": return 'point = (10, 20, 30)';
        case "dict": return 'user = {"name": "Alice", "role": "admin"}';
        case "str": return 'msg = "Hello"';
        default: return '';
    }
}

function renderCollectionExplorer() {
    const actionsContainer = document.getElementById("explorer-actions-container");
    const mutabilityTag = document.getElementById("explorer-mutability-tag");
    const memoryVisual = document.getElementById("explorer-memory-visual");
    
    if (!actionsContainer || !mutabilityTag || !memoryVisual) return;
    
    // Update Mutability Tag
    const isMutable = (colActiveTab === "list" || colActiveTab === "dict");
    if (isMutable) {
        mutabilityTag.textContent = "MUTABLE";
        mutabilityTag.style.background = "rgba(16, 185, 129, 0.1)";
        mutabilityTag.style.color = "var(--accent-green)";
    } else {
        mutabilityTag.textContent = "IMMUTABLE";
        mutabilityTag.style.background = "rgba(239, 68, 68, 0.1)";
        mutabilityTag.style.color = "var(--accent-red)";
    }
    
    // Render Actions
    actionsContainer.innerHTML = "";
    const actions = getCollectionActions();
    actions.forEach(act => {
        const btn = document.createElement("button");
        btn.className = "explorer-btn";
        btn.innerHTML = `<i class="${act.icon}"></i> ${act.label}`;
        btn.addEventListener("click", () => {
            executeCollectionAction(act);
        });
        actionsContainer.appendChild(btn);
    });
    
    // Render Memory Visual
    renderCollectionMemory();
}

function getCollectionActions() {
    switch (colActiveTab) {
        case "list":
            return [
                { id: "lst-append", label: 'fruits.append("date")', icon: "fa-solid fa-plus-circle", syntax: 'fruits.append("date")', type: "append" },
                { id: "lst-pop", label: 'fruits.pop()', icon: "fa-solid fa-minus-circle", syntax: 'fruits.pop()', type: "pop" },
                { id: "lst-mod", label: 'fruits[1] = "blueberry"', icon: "fa-solid fa-edit", syntax: 'fruits[1] = "blueberry"', type: "modify" },
                { id: "lst-slice", label: 'fruits[1:3]', icon: "fa-solid fa-scissors", syntax: 'fruits[1:3]', type: "slice" }
            ];
        case "tuple":
            return [
                { id: "tpl-access", label: 'point[0]', icon: "fa-solid fa-search", syntax: 'point[0]', type: "access" },
                { id: "tpl-mod", label: 'point[0] = 99 (Attempt)', icon: "fa-solid fa-triangle-exclamation", syntax: 'point[0] = 99', type: "modify_error" },
                { id: "tpl-unpack", label: 'x, y, z = point', icon: "fa-solid fa-arrows-split-up-and-left", syntax: 'x, y, z = point', type: "unpack" }
            ];
        case "dict":
            return [
                { id: "dct-lookup", label: 'user["role"]', icon: "fa-solid fa-search", syntax: 'user["role"]', type: "lookup" },
                { id: "dct-insert", label: 'user["age"] = 21', icon: "fa-solid fa-plus-circle", syntax: 'user["age"] = 21', type: "insert" },
                { id: "dct-mod", label: 'user["role"] = "user"', icon: "fa-solid fa-edit", syntax: 'user["role"] = "user"', type: "modify" },
                { id: "dct-delete", label: 'del user["role"]', icon: "fa-solid fa-trash", syntax: 'del user["role"]', type: "delete" }
            ];
        case "str":
            return [
                { id: "str-access", label: 'msg[1]', icon: "fa-solid fa-search", syntax: 'msg[1]', type: "access" },
                { id: "str-mod", label: 'msg[0] = "h" (Attempt)', icon: "fa-solid fa-triangle-exclamation", syntax: 'msg[0] = "h"', type: "modify_error" },
                { id: "str-concat", label: 'msg + " World"', icon: "fa-solid fa-circle-plus", syntax: 'msg + " World"', type: "concat" }
            ];
        default:
            return [];
    }
}

function renderCollectionMemory(highlightIdx = null, unpackActive = false, concatStrVal = null, lookupKey = null) {
    const memoryVisual = document.getElementById("explorer-memory-visual");
    if (!memoryVisual) return;
    
    memoryVisual.innerHTML = "";
    
    if (colActiveTab === "list") {
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.gap = "10px";
        container.style.flexWrap = "wrap";
        container.style.justifyContent = "center";
        container.style.alignItems = "center";
        
        colListState.forEach((val, idx) => {
            const box = document.createElement("div");
            box.className = "col-item-box";
            if (highlightIdx !== null && (highlightIdx === idx || (Array.isArray(highlightIdx) && highlightIdx.includes(idx)))) {
                box.classList.add("highlight");
            }
            box.innerHTML = `
                <span class="col-item-idx">[${idx}]</span>
                <span class="col-item-val">"${val}"</span>
            `;
            container.appendChild(box);
        });
        memoryVisual.appendChild(container);
    } 
    else if (colActiveTab === "tuple") {
        if (unpackActive) {
            // Render unpacked variables
            const container = document.createElement("div");
            container.style.display = "flex";
            container.style.flexDirection = "column";
            container.style.gap = "15px";
            container.style.width = "100%";
            
            // Tuple elements
            const tplRow = document.createElement("div");
            tplRow.style.display = "flex";
            tplRow.style.gap = "10px";
            tplRow.style.justifyContent = "center";
            tplRow.innerHTML = `<span style="font-size: 11px; font-weight:700; color: var(--accent-purple); align-self:center;">Tuple:</span>`;
            colTupleState.forEach((val, idx) => {
                tplRow.innerHTML += `
                    <div class="col-item-box locked" style="border-color: var(--accent-purple);">
                        <span class="col-item-idx">[${idx}]</span>
                        <span class="col-item-val">${val}</span>
                    </div>
                `;
            });
            container.appendChild(tplRow);
            
            // Unpacked Vars
            const varRow = document.createElement("div");
            varRow.style.display = "flex";
            varRow.style.gap = "15px";
            varRow.style.justifyContent = "center";
            const vars = ["x", "y", "z"];
            colTupleState.forEach((val, idx) => {
                varRow.innerHTML += `
                    <div class="col-item-box highlight" style="border-right: 3px solid var(--accent-green);">
                        <span class="col-item-idx" style="color: var(--accent-green); font-weight:700;">Var ${vars[idx]}</span>
                        <span class="col-item-val">${val}</span>
                    </div>
                `;
            });
            container.appendChild(varRow);
            memoryVisual.appendChild(container);
        } else {
            const container = document.createElement("div");
            container.style.display = "flex";
            container.style.gap = "10px";
            
            colTupleState.forEach((val, idx) => {
                const box = document.createElement("div");
                box.className = "col-item-box locked";
                if (highlightIdx === idx) {
                    box.classList.add("highlight");
                    box.classList.remove("locked");
                }
                box.innerHTML = `
                    <span class="col-item-idx">(${idx})</span>
                    <span class="col-item-val">${val}</span>
                    <span class="col-item-lock"><i class="fa-solid fa-lock"></i> readonly</span>
                `;
                container.appendChild(box);
            });
            memoryVisual.appendChild(container);
        }
    } 
    else if (colActiveTab === "dict") {
        const container = document.createElement("div");
        container.className = "dict-table-container";
        
        let rowsHtml = "";
        Object.entries(colDictState).forEach(([key, val]) => {
            const isHighlight = (lookupKey && lookupKey === key);
            rowsHtml += `
                <tr class="${isHighlight ? 'highlight' : ''}">
                    <td style="font-family: 'Fira Code', monospace; font-weight: 600; color: var(--accent-cyan);">"${key}"</td>
                    <td style="text-align:center; color: var(--text-muted);"><i class="fa-solid fa-arrow-right-long"></i></td>
                    <td style="font-family: 'Fira Code', monospace; font-weight: 600; color: var(--text-primary);">"${val}"</td>
                </tr>
            `;
        });
        
        container.innerHTML = `
            <table class="dict-table">
                <thead>
                    <tr>
                        <th>Key (Hash Code)</th>
                        <th></th>
                        <th>Value (Reference)</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        `;
        memoryVisual.appendChild(container);
    } 
    else if (colActiveTab === "str") {
        if (concatStrVal !== null) {
            const container = document.createElement("div");
            container.style.display = "flex";
            container.style.flexDirection = "column";
            container.style.gap = "12px";
            container.style.width = "100%";
            
            const origDiv = document.createElement("div");
            origDiv.style.display = "flex";
            origDiv.style.gap = "6px";
            origDiv.style.alignItems = "center";
            origDiv.innerHTML = `<span style="font-size: 11px; width: 80px; color: var(--text-muted);">Orig String:</span>`;
            [...colStrState].forEach((char, idx) => {
                origDiv.innerHTML += `<div class="col-item-box locked" style="padding: 4px 8px; min-width: 32px;"><span class="col-item-val" style="font-size:11px;">'${char}'</span></div>`;
            });
            container.appendChild(origDiv);
            
            const concatDiv = document.createElement("div");
            concatDiv.style.display = "flex";
            concatDiv.style.gap = "6px";
            concatDiv.style.alignItems = "center";
            concatDiv.style.flexWrap = "wrap";
            concatDiv.innerHTML = `<span style="font-size: 11px; width: 80px; color: var(--accent-purple); font-weight:700;">New Object:</span>`;
            [...concatStrVal].forEach((char, idx) => {
                const isNew = (idx >= colStrState.length);
                concatDiv.innerHTML += `
                    <div class="col-item-box ${isNew ? 'highlight' : 'locked'}" style="padding: 4px 8px; min-width: 32px;">
                        <span class="col-item-val" style="font-size:11px;">'${char}'</span>
                    </div>`;
            });
            container.appendChild(concatDiv);
            memoryVisual.appendChild(container);
        } else {
            const container = document.createElement("div");
            container.style.display = "flex";
            container.style.gap = "6px";
            
            [...colStrState].forEach((char, idx) => {
                const box = document.createElement("div");
                box.className = "col-item-box locked";
                if (highlightIdx === idx) {
                    box.classList.add("highlight");
                    box.classList.remove("locked");
                }
                box.style.padding = "6px 10px";
                box.style.minWidth = "36px";
                box.innerHTML = `
                    <span class="col-item-idx" style="font-size: 8px;">${idx}</span>
                    <span class="col-item-val">'${char}'</span>
                `;
                container.appendChild(box);
            });
            memoryVisual.appendChild(container);
        }
    }
}

function executeCollectionAction(action) {
    const statementCode = document.getElementById("explorer-statement-code");
    const explanationBox = document.getElementById("explorer-explanation-box");
    
    if (statementCode) {
        statementCode.innerHTML = highlightPythonSyntax(action.syntax);
    }
    
    explanationBox.style.borderLeftColor = "var(--accent-purple)";
    
    if (colActiveTab === "list") {
        if (action.type === "append") {
            if (colListState.length >= 4) {
                explanationBox.innerHTML = `<strong>Error:</strong> List size is capped at 4 for this simulation. Pop or Reset to append again!`;
                return;
            }
            colListState.push("date");
            renderCollectionMemory(colListState.length - 1);
            explanationBox.innerHTML = `<strong>list.append(x) executes in O(1) time:</strong> Appends the element to the end of the array. Because lists are <strong>mutable</strong>, this operation alters the array directly in place.`;
        } 
        else if (action.type === "pop") {
            if (colListState.length === 0) {
                explanationBox.innerHTML = `<strong>Error:</strong> List is already empty. Nothing to pop!`;
                return;
            }
            const popped = colListState.pop();
            renderCollectionMemory();
            explanationBox.innerHTML = `<strong>list.pop() executes in O(1) time:</strong> Removes and returns the last element of the list (<code>"${popped}"</code>). The list size shrinks dynamically in memory.`;
        } 
        else if (action.type === "modify") {
            if (colListState.length < 2) {
                explanationBox.innerHTML = `<strong>Error:</strong> List needs at least 2 elements to perform this modification. Click Reset first.`;
                return;
            }
            colListState[1] = "blueberry";
            renderCollectionMemory(1);
            explanationBox.innerHTML = `<strong>list[idx] = val executes in O(1) time:</strong> Modifies the index reference directly. Lists are <strong>mutable</strong>, so <code>"banana"</code> is replaced by <code>"blueberry"</code> in-place.`;
        } 
        else if (action.type === "slice") {
            const subIndices = [];
            colListState.forEach((val, idx) => {
                if (idx >= 1 && idx < 3) subIndices.push(idx);
            });
            renderCollectionMemory(subIndices);
            const sliceRes = colListState.slice(1, 3);
            explanationBox.innerHTML = `<strong>Slicing list[1:3] (interval [1, 3)):</strong> Extracts elements at index 1 and 2. Returns a <strong>new</strong> list object containing <code>${JSON.stringify(sliceRes)}</code>.`;
        }
    } 
    else if (colActiveTab === "tuple") {
        if (action.type === "access") {
            renderCollectionMemory(0);
            explanationBox.innerHTML = `<strong>tuple[idx] executes in O(1) time:</strong> Retrieves the value stored at index 0. Reading values from a tuple is identical to reading from a standard array.`;
        } 
        else if (action.type === "modify_error") {
            renderCollectionMemory();
            const memoryVisual = document.getElementById("explorer-memory-visual");
            const firstBox = memoryVisual.querySelector(".col-item-box");
            if (firstBox) {
                firstBox.classList.add("type-error-flash");
                setTimeout(() => firstBox.classList.remove("type-error-flash"), 500);
            }
            
            explanationBox.style.borderLeftColor = "var(--accent-red)";
            explanationBox.innerHTML = `<span style="color: var(--accent-red); font-weight:700;"><i class="fa-solid fa-circle-xmark"></i> TypeError: 'tuple' object does not support item assignment</span><br>This demonstrates <strong>Immutability</strong>. Once created, a tuple's structure and values cannot be altered. If you need a collection that can be changed, you must use a <strong>List</strong> instead.`;
        } 
        else if (action.type === "unpack") {
            renderCollectionMemory(null, true);
            explanationBox.innerHTML = `<strong>Tuple Unpacking:</strong> Destructures the tuple's elements and assigns them to multiple local variables (<code>x</code>, <code>y</code>, and <code>z</code>) simultaneously. This is a very clean syntax feature common in Python algorithms.`;
        }
    } 
    else if (colActiveTab === "dict") {
        if (action.type === "lookup") {
            renderCollectionMemory(null, false, null, "role");
            explanationBox.innerHTML = `<strong>dict[key] executes in O(1) average time:</strong> Python hashes the key string <code>"role"</code> and accesses its value slot instantly. This is a O(1) Hash Map lookup.`;
        } 
        else if (action.type === "insert") {
            colDictState["age"] = 21;
            renderCollectionMemory(null, false, null, "age");
            explanationBox.innerHTML = `<strong>dict[new_key] = val executes in O(1) time:</strong> Adds a new key-value pair <code>"age": 21</code> directly to the table. Python dictionaries automatically grow in capacity.`;
        } 
        else if (action.type === "modify") {
            colDictState["role"] = "user";
            renderCollectionMemory(null, false, null, "role");
            explanationBox.innerHTML = `<strong>dict[existing_key] = new_val executes in O(1) time:</strong> Modifies the value associated with key <code>"role"</code>. Dictionaries are <strong>mutable</strong> collections.`;
        } 
        else if (action.type === "delete") {
            if (!colDictState.hasOwnProperty("role")) {
                explanationBox.innerHTML = `<strong>Error:</strong> Key "role" has already been deleted! Reset to test again.`;
                return;
            }
            delete colDictState["role"];
            renderCollectionMemory();
            explanationBox.innerHTML = `<strong>del dict[key] executes in O(1) time:</strong> Deletes the key-value association, freeing up the key reference from the dictionary structure.`;
        }
    } 
    else if (colActiveTab === "str") {
        if (action.type === "access") {
            renderCollectionMemory(1);
            explanationBox.innerHTML = `<strong>str[idx] executes in O(1) time:</strong> Retrieves the character at index 1. Strings behave like immutable character arrays.`;
        } 
        else if (action.type === "modify_error") {
            renderCollectionMemory();
            const memoryVisual = document.getElementById("explorer-memory-visual");
            const firstBox = memoryVisual.querySelector(".col-item-box");
            if (firstBox) {
                firstBox.classList.add("type-error-flash");
                setTimeout(() => firstBox.classList.remove("type-error-flash"), 500);
            }
            
            explanationBox.style.borderLeftColor = "var(--accent-red)";
            explanationBox.innerHTML = `<span style="color: var(--accent-red); font-weight:700;"><i class="fa-solid fa-circle-xmark"></i> TypeError: 'str' object does not support item assignment</span><br>Strings in Python are <strong>immutable</strong> sequences of characters. You cannot modify a string element in-place.`;
        } 
        else if (action.type === "concat") {
            const concatVal = colStrState + " World";
            renderCollectionMemory(null, false, concatVal);
            explanationBox.innerHTML = `<strong>String Concatenation (msg + " World"):</strong> Since strings are <strong>immutable</strong>, Python does not expand the original block. Instead, it creates a completely <strong>new string object</strong> in memory at a different address containing <code>"Hello World"</code>.`;
        }
    }
}




/* -------------------------------------------------------------
   Interactive Control Flow & Loops Simulator Logic
   ------------------------------------------------------------- */
let flowActiveTab = 'cond';

function switchFlowTab(tabId) {
    flowActiveTab = tabId;
    
    const tabCond = document.getElementById("flow-tab-cond");
    const tabLoop = document.getElementById("flow-tab-loop");
    if (tabCond && tabLoop) {
        if (tabId === 'cond') {
            tabCond.classList.add("active");
            tabLoop.classList.remove("active");
        } else {
            tabCond.classList.remove("active");
            tabLoop.classList.add("active");
        }
    }
    
    const ctrlCond = document.getElementById("flow-controls-cond");
    const ctrlLoop = document.getElementById("flow-controls-loop");
    if (ctrlCond && ctrlLoop) {
        ctrlCond.style.display = tabId === 'cond' ? 'block' : 'none';
        ctrlLoop.style.display = tabId === 'loop' ? 'block' : 'none';
    }
    
    const varsTracker = document.getElementById("loop-vars-tracker");
    if (tabId === 'cond') {
        document.getElementById("flow-code-title").textContent = "conditional_test.py";
        if (varsTracker) varsTracker.textContent = "Active vars: gpa";
        const slider = document.getElementById("flow-gpa-slider");
        if (slider) {
            updateGpaBranches(slider.value);
        }
    } else {
        document.getElementById("flow-code-title").textContent = "loop_simulation.py";
        selectLoopType(currentLoopType);
    }
}

const condCodeTemplate = [
    { line: 1, text: "gpa = [val]", isCode: true },
    { line: 2, text: "", isCode: false },
    { line: 3, text: "if gpa >= 3.50:", isCode: true },
    { line: 4, text: "    print(\"Honor Roll\")", isCode: true },
    { line: 5, text: "elif gpa >= 2.00:", isCode: true },
    { line: 6, text: "    print(\"Pass\")", isCode: true },
    { line: 7, text: "else:", isCode: true },
    { line: 8, text: "    print(\"Fail\")", isCode: true }
];

function updateGpaBranches(gpaVal) {
    const gpaFloat = parseFloat(gpaVal);
    const sliderValSpan = document.getElementById("flow-gpa-val");
    if (sliderValSpan) {
        sliderValSpan.textContent = gpaFloat.toFixed(1);
    }
    
    let activeLines = [1];
    let output = "";
    let explanation = "";
    
    if (gpaFloat >= 3.50) {
        activeLines.push(3, 4);
        output = "Honor Roll";
        explanation = `GPA ${gpaFloat.toFixed(2)} >= 3.50 evaluates <strong>True</strong>. The first <code>if</code> branch triggers, outputting <code>"Honor Roll"</code>. Other branches are ignored.`;
    } else if (gpaFloat >= 2.00) {
        activeLines.push(5, 6);
        output = "Pass";
        explanation = `GPA ${gpaFloat.toFixed(2)} is &lt; 3.50 (<code>if</code> evaluates <strong>False</strong>), but is >= 2.00 (<code>elif</code> evaluates <strong>True</strong>), outputting <code>"Pass"</code>.`;
    } else {
        activeLines.push(7, 8);
        output = "Fail";
        explanation = `GPA ${gpaFloat.toFixed(2)} is &lt; 2.00. Both <code>if</code> and <code>elif</code> check expressions evaluate <strong>False</strong>. The fallback <code>else</code> block is executed, outputting <code>"Fail"</code>.`;
    }
    
    renderFlowCode(condCodeTemplate, activeLines, { "[val]": gpaFloat.toFixed(2) });
    
    const consoleText = document.getElementById("flow-console-text");
    if (consoleText) {
        consoleText.textContent = `>>> gpa = ${gpaFloat.toFixed(2)}\n>>> running conditional_test.py...\n${output}`;
    }
    
    const explanationEl = document.getElementById("flow-cond-explanation");
    if (explanationEl) {
        explanationEl.innerHTML = explanation;
        explanationEl.style.borderLeftColor = gpaFloat >= 3.50 ? 'var(--accent-green)' : (gpaFloat >= 2.00 ? 'var(--accent-cyan)' : 'var(--accent-red)');
    }
    
    const varsTracker = document.getElementById("loop-vars-tracker");
    if (varsTracker) {
        varsTracker.textContent = `Active vars: gpa = ${gpaFloat.toFixed(2)}`;
    }
}

let currentLoopType = 'range';
let loopSimStep = 0;

const loopTemplates = {
    range: {
        code: [
            { line: 1, text: "# counting with range()", isCode: false },
            { line: 2, text: "for i in range(5):", isCode: true },
            { line: 3, text: "    print(f\"Val: {i}\")", isCode: true }
        ],
        steps: [
            { activeLines: [2], vars: { i: 0 }, output: ">>> running loop_simulation.py...\n" },
            { activeLines: [3], vars: { i: 0 }, output: ">>> running loop_simulation.py...\nVal: 0\n" },
            { activeLines: [2], vars: { i: 1 }, output: ">>> running loop_simulation.py...\nVal: 0\n" },
            { activeLines: [3], vars: { i: 1 }, output: ">>> running loop_simulation.py...\nVal: 0\nVal: 1\n" },
            { activeLines: [2], vars: { i: 2 }, output: ">>> running loop_simulation.py...\nVal: 0\nVal: 1\n" },
            { activeLines: [3], vars: { i: 2 }, output: ">>> running loop_simulation.py...\nVal: 0\nVal: 1\nVal: 2\n" },
            { activeLines: [2], vars: { i: 3 }, output: ">>> running loop_simulation.py...\nVal: 0\nVal: 1\nVal: 2\n" },
            { activeLines: [3], vars: { i: 3 }, output: ">>> running loop_simulation.py...\nVal: 0\nVal: 1\nVal: 2\nVal: 3\n" },
            { activeLines: [2], vars: { i: 4 }, output: ">>> running loop_simulation.py...\nVal: 0\nVal: 1\nVal: 2\nVal: 3\n" },
            { activeLines: [3], vars: { i: 4 }, output: ">>> running loop_simulation.py...\nVal: 0\nVal: 1\nVal: 2\nVal: 3\nVal: 4\n" },
            { activeLines: [], vars: { i: 'Finished' }, output: ">>> running loop_simulation.py...\nVal: 0\nVal: 1\nVal: 2\nVal: 3\nVal: 4\n\n>>> Loop execution finished." }
        ]
    },
    list: {
        code: [
            { line: 1, text: "arr = [10, 20, 30]", isCode: true },
            { line: 2, text: "for val in arr:", isCode: true },
            { line: 3, text: "    print(f\"Element: {val}\")", isCode: true }
        ],
        steps: [
            { activeLines: [1], vars: { arr: "[10, 20, 30]", val: "undefined" }, output: ">>> running loop_simulation.py...\n" },
            { activeLines: [2], vars: { arr: "[10, 20, 30]", val: 10 }, output: ">>> running loop_simulation.py...\n" },
            { activeLines: [3], vars: { arr: "[10, 20, 30]", val: 10 }, output: ">>> running loop_simulation.py...\nElement: 10\n" },
            { activeLines: [2], vars: { arr: "[10, 20, 30]", val: 20 }, output: ">>> running loop_simulation.py...\nElement: 10\n" },
            { activeLines: [3], vars: { arr: "[10, 20, 30]", val: 20 }, output: ">>> running loop_simulation.py...\nElement: 10\nElement: 20\n" },
            { activeLines: [2], vars: { arr: "[10, 20, 30]", val: 30 }, output: ">>> running loop_simulation.py...\nElement: 10\nElement: 20\n" },
            { activeLines: [3], vars: { arr: "[10, 20, 30]", val: 30 }, output: ">>> running loop_simulation.py...\nElement: 10\nElement: 20\nElement: 30\n" },
            { activeLines: [], vars: { arr: "[10, 20, 30]", val: "Finished" }, output: ">>> running loop_simulation.py...\nElement: 10\nElement: 20\nElement: 30\n\n>>> Loop execution finished." }
        ]
    },
    while: {
        code: [
            { line: 1, text: "count = 0", isCode: true },
            { line: 2, text: "while count < 3:", isCode: true },
            { line: 3, text: "    print(count)", isCode: true },
            { line: 4, text: "    count += 1", isCode: true }
        ],
        steps: [
            { activeLines: [1], vars: { count: 0 }, output: ">>> running loop_simulation.py...\n" },
            { activeLines: [2], vars: { count: 0 }, output: ">>> running loop_simulation.py...\n" },
            { activeLines: [3], vars: { count: 0 }, output: ">>> running loop_simulation.py...\n0\n" },
            { activeLines: [4], vars: { count: 0 }, output: ">>> running loop_simulation.py...\n0\n" },
            { activeLines: [2], vars: { count: 1 }, output: ">>> running loop_simulation.py...\n0\n" },
            { activeLines: [3], vars: { count: 1 }, output: ">>> running loop_simulation.py...\n0\n1\n" },
            { activeLines: [4], vars: { count: 1 }, output: ">>> running loop_simulation.py...\n0\n1\n" },
            { activeLines: [2], vars: { count: 2 }, output: ">>> running loop_simulation.py...\n0\n1\n" },
            { activeLines: [3], vars: { count: 2 }, output: ">>> running loop_simulation.py...\n0\n1\n2\n" },
            { activeLines: [4], vars: { count: 2 }, output: ">>> running loop_simulation.py...\n0\n1\n2\n" },
            { activeLines: [2], vars: { count: 3 }, output: ">>> running loop_simulation.py...\n0\n1\n2\n" },
            { activeLines: [], vars: { count: 3 }, output: ">>> running loop_simulation.py...\n0\n1\n2\n\n>>> while loop test: count < 3 evaluates False. Loop ended." }
        ]
    }
};

function selectLoopType(loopType) {
    currentLoopType = loopType;
    loopSimStep = 0;
    
    ['range', 'list', 'while'].forEach(type => {
        const btn = document.getElementById("loop-btn-" + type);
        if (btn) {
            if (type === loopType) {
                btn.classList.add("active");
                btn.style.backgroundColor = "rgba(6, 182, 212, 0.25)";
                btn.style.borderColor = "var(--accent-cyan)";
                btn.style.color = "#ffffff";
            } else {
                btn.classList.remove("active");
                btn.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
                btn.style.borderColor = "var(--border-color)";
                btn.style.color = "var(--text-secondary)";
            }
        }
    });
    
    const stepBtn = document.getElementById("flow-step-btn");
    if (stepBtn) {
        stepBtn.disabled = false;
        stepBtn.innerHTML = '<i class="fa-solid fa-forward-step"></i> Step Loop';
    }
    
    const template = loopTemplates[loopType];
    renderFlowCode(template.code, template.steps[0].activeLines);
    
    const consoleText = document.getElementById("flow-console-text");
    if (consoleText) {
        consoleText.textContent = template.steps[0].output;
    }
    
    updateVarsTracker(template.steps[0].vars);
}

function stepLoopSimulation() {
    const template = loopTemplates[currentLoopType];
    loopSimStep++;
    
    if (loopSimStep >= template.steps.length) {
        resetLoopSimulation();
        return;
    }
    
    const step = template.steps[loopSimStep];
    renderFlowCode(template.code, step.activeLines);
    
    const consoleText = document.getElementById("flow-console-text");
    if (consoleText) {
        consoleText.textContent = step.output;
    }
    
    updateVarsTracker(step.vars);
    
    if (loopSimStep === template.steps.length - 1) {
        const stepBtn = document.getElementById("flow-step-btn");
        if (stepBtn) {
            stepBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Start Over';
        }
    }
}

function resetLoopSimulation() {
    selectLoopType(currentLoopType);
}

function updateVarsTracker(varsObj) {
    const tracker = document.getElementById("loop-vars-tracker");
    if (tracker) {
        let varsStr = "Active vars: ";
        let pairs = [];
        for (let name in varsObj) {
            pairs.push(`${name} = ${varsObj[name]}`);
        }
        tracker.textContent = varsStr + (pairs.length > 0 ? pairs.join(", ") : "(none)");
    }
}

function escapeHtml(text) {
    return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightPythonLine(text) {
    if (!text) return "";
    
    // Check if it is a whole comment line
    if (text.trim().startsWith("#")) {
        return `<span class="code-comment">${escapeHtml(text)}</span>`;
    }
    
    let i = 0;
    let result = "";
    
    const keywords = new Set(['if', 'elif', 'else', 'for', 'in', 'while', 'try', 'except', 'as', 'with', 'def', 'class', 'return', 'import', 'from', 'pass', 'and', 'or', 'not', 'is', 'lambda', 'None', 'True', 'False']);
    const builtins = new Set(['print', 'int', 'float', 'str', 'range', 'len', 'enumerate', 'list', 'dict', 'tuple', 'assert']);
    
    while (i < text.length) {
        const char = text[i];
        
        // 1. Comments
        if (char === '#') {
            result += `<span class="code-comment">${escapeHtml(text.substring(i))}</span>`;
            break;
        }
        
        // 2. String literals
        if (char === '"' || char === "'") {
            const quote = char;
            let start = i;
            i++; // skip quote
            while (i < text.length && text[i] !== quote) {
                if (text[i] === '\\' && i + 1 < text.length) {
                    i += 2;
                } else {
                    i++;
                }
            }
            if (i < text.length) i++; // consume closing quote
            const strVal = text.substring(start, i);
            result += `<span class="code-string">${escapeHtml(strVal)}</span>`;
            continue;
        }
        
        // 3. Numbers (integers or floats)
        const numMatch = text.substring(i).match(/^(\d+(\.\d+)?)\b/);
        if (numMatch) {
            const numStr = numMatch[1];
            result += `<span class="code-number">${escapeHtml(numStr)}</span>`;
            i += numStr.length;
            continue;
        }
        
        // 4. Identifiers / Keywords / Builtins
        const wordMatch = text.substring(i).match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (wordMatch) {
            const word = wordMatch[1];
            if (keywords.has(word)) {
                result += `<span class="code-keyword">${escapeHtml(word)}</span>`;
            } else if (builtins.has(word)) {
                result += `<span class="code-builtin">${escapeHtml(word)}</span>`;
            } else {
                result += escapeHtml(word);
            }
            i += word.length;
            continue;
        }
        
        // 5. Normal characters
        result += escapeHtml(char);
        i++;
    }
    
    return result;
}

function highlightCLine(text) {
    if (!text) return "";
    
    if (text.trim().startsWith("//")) {
        return `<span class="code-comment">${escapeHtml(text)}</span>`;
    }
    
    let i = 0;
    let result = "";
    
    const keywords = new Set(['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return', 'struct', 'typedef', 'sizeof', 'int', 'char', 'float', 'double', 'long', 'short', 'unsigned', 'void', 'const', 'static', 'bool', 'true', 'false']);
    const builtins = new Set(['printf', 'scanf', 'malloc', 'free', 'realloc', 'calloc', 'fopen', 'fclose', 'perror', 'exit', 'NULL']);
    const preprocessors = new Set(['#include', '#define', '#ifdef', '#ifndef', '#endif', '#pragma']);
    
    while (i < text.length) {
        const char = text[i];
        
        // 1. Comments
        if (char === '/' && text[i+1] === '/') {
            result += `<span class="code-comment">${escapeHtml(text.substring(i))}</span>`;
            break;
        }
        if (char === '/' && text[i+1] === '*') {
            const endIdx = text.indexOf("*/", i + 2);
            if (endIdx !== -1) {
                const comment = text.substring(i, endIdx + 2);
                result += `<span class="code-comment">${escapeHtml(comment)}</span>`;
                i += comment.length;
                continue;
            }
        }
        
        // 2. Preprocessor directive
        if (char === '#') {
            const prepMatch = text.substring(i).match(/^(#[a-zA-Z_][a-zA-Z0-9_]*)/);
            if (prepMatch) {
                const prep = prepMatch[1];
                result += `<span class="code-keyword">${escapeHtml(prep)}</span>`;
                i += prep.length;
                continue;
            }
        }
        
        // 3. String literals
        if (char === '"' || char === "'") {
            const quote = char;
            let start = i;
            i++; // skip quote
            while (i < text.length && text[i] !== quote) {
                if (text[i] === '\\' && i + 1 < text.length) {
                    i += 2;
                } else {
                    i++;
                }
            }
            if (i < text.length) i++; // consume closing quote
            const strVal = text.substring(start, i);
            result += `<span class="code-string">${escapeHtml(strVal)}</span>`;
            continue;
        }
        
        // 4. Numbers
        const numMatch = text.substring(i).match(/^(\d+(\.\d+)?)\b/);
        if (numMatch) {
            const numStr = numMatch[1];
            result += `<span class="code-number">${escapeHtml(numStr)}</span>`;
            i += numStr.length;
            continue;
        }
        
        // 5. Identifiers / Keywords / Builtins
        const wordMatch = text.substring(i).match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (wordMatch) {
            const word = wordMatch[1];
            if (keywords.has(word)) {
                result += `<span class="code-keyword">${escapeHtml(word)}</span>`;
            } else if (builtins.has(word)) {
                result += `<span class="code-builtin">${escapeHtml(word)}</span>`;
            } else {
                result += escapeHtml(word);
            }
            i += word.length;
            continue;
        }
        
        result += escapeHtml(char);
        i++;
    }
    
    return result;
}

function highlightAllStaticCode() {
    const codeBlocks = document.querySelectorAll("pre code");
    codeBlocks.forEach(block => {
        // Skip code panels of simulators that are dynamically highlighted
        if (block.closest(".flow-code-panel") || block.closest(".exception-code-window") || block.id === "exc-code-display" || block.id === "flow-code-display") {
            return;
        }
        
        const isC = block.closest(".c-block") || block.classList.contains("language-c");
        const isPython = block.closest(".py-block") || block.classList.contains("language-python") || block.closest(".python-block");
        
        const rawText = block.textContent;
        // Split by newlines, highlight each line, and join
        const lines = rawText.split("\n");
        let highlightedHtml = "";
        
        if (isC) {
            highlightedHtml = lines.map(line => highlightCLine(line)).join("\n");
        } else if (isPython) {
            highlightedHtml = lines.map(line => highlightPythonLine(line)).join("\n");
        } else {
            // Default to Python highlighter if unspecified
            highlightedHtml = lines.map(line => highlightPythonLine(line)).join("\n");
        }
        
        block.innerHTML = highlightedHtml;
    });
}

function renderFlowCode(codeArr, activeLines, replacements = {}) {
    const container = document.getElementById("flow-code-display");
    if (!container) return;
    
    let html = "";
    codeArr.forEach(lineObj => {
        let lineText = lineObj.text;
        for (let key in replacements) {
            lineText = lineText.replace(key, replacements[key]);
        }
        
        const highlighted = highlightPythonLine(lineText);
        const isActive = activeLines.includes(lineObj.line);
        if (lineObj.isCode) {
            html += `<span class="flow-code-line${isActive ? ' active' : ''}">${highlighted}</span>`;
        } else {
            html += `<span class="flow-code-comment" style="padding: 3px 8px; display: block;">${highlighted}</span>`;
        }
    });
    
    container.innerHTML = html;
}


/* -------------------------------------------------------------
   Exception Shield Game Logic
   ------------------------------------------------------------- */const exceptionScenarios = {
    ZeroDivisionError: {
        title: "ZeroDivisionError",
        filename: "division_by_zero.py",
        desc: "Occurs when a division or modulo operation has zero as the divisor. In C, dividing by zero causes undefined behavior or immediate program termination (core dump). Python raises a ZeroDivisionError.",
        codeRaw: [
            { line: 1, text: "# Division by zero scenario", isCode: false },
            { line: 2, text: "x = 10", isCode: true },
            { line: 3, text: "y = 0", isCode: true },
            { line: 4, text: "print(\"Dividing x by y...\")", isCode: true },
            { line: 5, text: "result = x / y  # Raises ZeroDivisionError!", isCode: true, isCrash: true },
            { line: 6, text: "print(f\"Result: {result}\") # NEVER runs!", isCode: true }
        ],
        codeShielded: [
            { line: 1, text: "# Shielded division by zero", isCode: false },
            { line: 2, text: "print(\"Dividing x by y...\")", isCode: true },
            { line: 3, text: "try:", isCode: true },
            { line: 4, text: "    x = 10", isCode: true },
            { line: 5, text: "    y = 0", isCode: true },
            { line: 6, text: "    result = x / y", isCode: true },
            { line: 7, text: "    print(f\"Result: {result}\")", isCode: true },
            { line: 8, text: "except ZeroDivisionError:", isCode: true },
            { line: 9, text: "    print(\"Error: Cannot divide by zero!\")", isCode: true },
            { line: 10, text: "", isCode: false },
            { line: 11, text: "print(\"Program continues running successfully!\")", isCode: true }
        ],
        crashOutput: `>>> running division_by_zero.py...
Dividing x by y...
Traceback (most recent call last):
  File "division_by_zero.py", line 5, in <module>
    result = x / y
ZeroDivisionError: division by zero

❌ CRASH! Program terminated prematurely.`,
        shieldedOutput: `>>> running division_by_zero.py...
Dividing x by y...
Error: Cannot divide by zero!
Program continues running successfully!

✅ SUCCESS! Exception caught safely.`,
        explanation: "Since <code>y</code> is 0, line 5 raises a <code>ZeroDivisionError</code>. The <code>except ZeroDivisionError</code> block catches this immediately, runs the error-handling print on line 9, and the program happily continues executing the rest of the file instead of crashing."
    },
    ValueError: {
        title: "ValueError",
        filename: "invalid_conversion.py",
        desc: "Raised when an operation or function receives an argument that has the right type but an inappropriate value. In C, calling `atoi(\"forty-two\")` returns 0 silently without telling you it failed. Python safely raises a ValueError.",
        codeRaw: [
            { line: 1, text: "# Invalid type conversion scenario", isCode: false },
            { line: 2, text: "user_input = \"forty-two\"", isCode: true },
            { line: 3, text: "print(\"Parsing user input...\")", isCode: true },
            { line: 4, text: "number = int(user_input) # Raises ValueError!", isCode: true, isCrash: true },
            { line: 5, text: "print(f\"Number: {number}\") # NEVER runs!", isCode: true }
        ],
        codeShielded: [
            { line: 1, text: "# Shielded type conversion", isCode: false },
            { line: 2, text: "user_input = \"forty-two\"", isCode: true },
            { line: 3, text: "print(\"Parsing user input...\")", isCode: true },
            { line: 4, text: "try:", isCode: true },
            { line: 5, text: "    number = int(user_input)", isCode: true },
            { line: 6, text: "    print(f\"Number: {number}\")", isCode: true },
            { line: 7, text: "except ValueError:", isCode: true },
            { line: 8, text: "    print(\"Error: Input is not a valid integer string!\")", isCode: true },
            { line: 9, text: "", isCode: false },
            { line: 10, text: "print(\"Program continues running successfully!\")", isCode: true }
        ],
        crashOutput: `>>> running invalid_conversion.py...
Parsing user input...
Traceback (most recent call last):
  File "invalid_conversion.py", line 4, in <module>
    number = int(user_input)
ValueError: invalid literal for int() with base 10: 'forty-two'

❌ CRASH! Program terminated prematurely.`,
        shieldedOutput: `>>> running invalid_conversion.py...
Parsing user input...
Error: Input is not a valid integer string!
Program continues running successfully!

✅ SUCCESS! Exception caught safely.`,
        explanation: "The string <code>\"forty-two\"</code> cannot be parsed into a numeric digit. Line 4 raises a <code>ValueError</code>, which is caught on line 7, triggering a warning instead of a crash."
    },
    IndexError: {
        title: "IndexError",
        filename: "array_out_of_bounds.py",
        desc: "Raised when trying to access a list index that is out of range. In C, accessing `arr[5]` on an array of size 3 reads garbage data or causes a segmentation fault. Python raises an IndexError to guarantee memory safety.",
        codeRaw: [
            { line: 1, text: "# List index out of range scenario", isCode: false },
            { line: 2, text: "arr = [10, 20, 30]", isCode: true },
            { line: 3, text: "print(\"Accessing list element...\")", isCode: true },
            { line: 4, text: "value = arr[5] # Raises IndexError!", isCode: true, isCrash: true },
            { line: 5, text: "print(f\"Value: {value}\") # NEVER runs!", isCode: true }
        ],
        codeShielded: [
            { line: 1, text: "# Shielded index access", isCode: false },
            { line: 2, text: "arr = [10, 20, 30]", isCode: true },
            { line: 3, text: "print(\"Accessing list element...\")", isCode: true },
            { line: 4, text: "try:", isCode: true },
            { line: 5, text: "    value = arr[5]", isCode: true },
            { line: 6, text: "    print(f\"Value: {value}\")", isCode: true },
            { line: 7, text: "except IndexError:", isCode: true },
            { line: 8, text: "    print(\"Error: List index is out of bounds!\")", isCode: true },
            { line: 9, text: "", isCode: false },
            { line: 10, text: "print(\"Program continues running successfully!\")", isCode: true }
        ],
        crashOutput: `>>> running array_out_of_bounds.py...
Accessing list element...
Traceback (most recent call last):
  File "array_out_of_bounds.py", line 4, in <module>
    value = arr[5]
IndexError: list index out of range

❌ CRASH! Program terminated prematurely.`,
        shieldedOutput: `>>> running array_out_of_bounds.py...
Accessing list element...
Error: List index is out of bounds!
Program continues running successfully!

✅ SUCCESS! Exception caught safely.`,
        explanation: "The list has elements at index 0, 1, and 2. Index 5 is out of bounds, so line 4 raises an <code>IndexError</code>. The exception handler on line 7 catches it and recovers gracefully."
    },
    KeyError: {
        title: "KeyError",
        filename: "dictionary_lookup.py",
        desc: "Raised when looking up a key that doesn't exist in a dictionary key set. Similar to an index check, but for hash maps.",
        codeRaw: [
            { line: 1, text: "# Dictionary key lookup scenario", isCode: false },
            { line: 2, text: "student = {\"id\": \"B680001\", \"name\": \"Somchai\"}", isCode: true },
            { line: 3, text: "print(\"Looking up student GPA...\")", isCode: true },
            { line: 4, text: "gpa = student[\"gpa\"] # Raises KeyError!", isCode: true, isCrash: true },
            { line: 5, text: "print(f\"GPA: {gpa}\") # NEVER runs!", isCode: true }
        ],
        codeShielded: [
            { line: 1, text: "# Shielded dictionary lookup", isCode: false },
            { line: 2, text: "student = {\"id\": \"B680001\", \"name\": \"Somchai\"}", isCode: true },
            { line: 3, text: "print(\"Looking up student GPA...\")", isCode: true },
            { line: 4, text: "try:", isCode: true },
            { line: 5, text: "    gpa = student[\"gpa\"]", isCode: true },
            { line: 6, text: "    print(f\"GPA: {gpa}\")", isCode: true },
            { line: 7, text: "except KeyError:", isCode: true },
            { line: 8, text: "    print(\"Error: Key 'gpa' not found in dictionary!\")", isCode: true },
            { line: 9, text: "", isCode: false },
            { line: 10, text: "print(\"Program continues running successfully!\")", isCode: true }
        ],
        crashOutput: `>>> running dictionary_lookup.py...
Looking up student GPA...
Traceback (most recent call last):
  File "dictionary_lookup.py", line 4, in <module>
    gpa = student["gpa"]
KeyError: 'gpa'

❌ CRASH! Program terminated prematurely.`,
        shieldedOutput: `>>> running dictionary_lookup.py...
Looking up student GPA...
Error: Key 'gpa' not found in dictionary!
Program continues running successfully!

✅ SUCCESS! Exception caught safely.`,
        explanation: "The dictionary has only keys <code>'id'</code> and <code>'name'</code>. Accessing <code>'gpa'</code> raises a <code>KeyError</code>, which is caught and handled on line 7."
    }
};

let currentExcScenario = 'ZeroDivisionError';
let excShieldActive = false;

function switchExceptionScenario(scenarioKey) {
    currentExcScenario = scenarioKey;
    
    // Toggle active tab buttons
    ['ZeroDivisionError', 'ValueError', 'IndexError', 'KeyError'].forEach(key => {
        const tabBtn = document.getElementById("exc-tab-" + key);
        if (tabBtn) {
            if (key === scenarioKey) {
                tabBtn.classList.add("active");
            } else {
                tabBtn.classList.remove("active");
            }
        }
    });
    
    const scenario = exceptionScenarios[scenarioKey];
    if (!scenario) return;
    
    // Update labels
    document.getElementById("exc-filename").textContent = scenario.filename;
    document.getElementById("exc-type-header").textContent = scenario.title;
    document.getElementById("exc-description").textContent = scenario.desc;
    
    // Hide explanation box and reset console
    document.getElementById("exc-explanation-card").style.display = "none";
    document.getElementById("exc-console-text").textContent = "Click \"Run Code Simulation\" to execute the script.";
    document.getElementById("exc-console-status").textContent = "Idle";
    document.getElementById("exc-console-status").style.color = "var(--text-muted)";
    
    // Reset console box styling
    const consoleBox = document.getElementById("exc-console-box");
    if (consoleBox) {
        consoleBox.style.borderColor = "var(--border-color)";
    }
    
    renderExceptionCode();
}

function setExceptionShieldState(isActive) {
    excShieldActive = isActive;
    
    const offBtn = document.getElementById("shield-off-btn");
    const onBtn = document.getElementById("shield-on-btn");
    
    if (offBtn && onBtn) {
        if (isActive) {
            onBtn.classList.add("active");
            offBtn.classList.remove("active");
        } else {
            offBtn.classList.add("active");
            onBtn.classList.remove("active");
        }
    }
    
    // Reset console and hide explanation
    document.getElementById("exc-explanation-card").style.display = "none";
    document.getElementById("exc-console-text").textContent = "Click \"Run Code Simulation\" to execute the script.";
    document.getElementById("exc-console-status").textContent = "Idle";
    document.getElementById("exc-console-status").style.color = "var(--text-muted)";
    
    const consoleBox = document.getElementById("exc-console-box");
    if (consoleBox) {
        consoleBox.style.borderColor = "var(--border-color)";
    }
    
    renderExceptionCode();
}

function renderExceptionCode(highlightLines = [], isCrashRun = false) {
    const container = document.getElementById("exc-code-display");
    if (!container) return;
    
    const scenario = exceptionScenarios[currentExcScenario];
    const codeArr = excShieldActive ? scenario.codeShielded : scenario.codeRaw;
    
    let html = "";
    codeArr.forEach(lineObj => {
        const lineText = lineObj.text;
        const highlighted = highlightPythonLine(lineText);
        
        let lineClass = "flow-code-line";
        if (highlightLines.includes(lineObj.line)) {
            lineClass += isCrashRun && lineObj.isCrash ? " crash" : " active";
        }
        
        if (lineObj.isCode) {
            html += `<span class="${lineClass}">${highlighted}</span>`;
        } else {
            html += `<span class="flow-code-comment" style="padding: 3px 8px; display: block;">${highlighted}</span>`;
        }
    });
    
    container.innerHTML = html;
}

function runExceptionSimulation() {
    const scenario = exceptionScenarios[currentExcScenario];
    if (!scenario) return;
    
    const consoleText = document.getElementById("exc-console-text");
    const consoleStatus = document.getElementById("exc-console-status");
    const consoleBox = document.getElementById("exc-console-box");
    const explanationCard = document.getElementById("exc-explanation-card");
    
    if (excShieldActive) {
        // Run shielded code
        if (consoleText) consoleText.textContent = scenario.shieldedOutput;
        if (consoleStatus) {
            consoleStatus.textContent = "Success";
            consoleStatus.style.color = "var(--accent-green)";
        }
        if (consoleBox) {
            consoleBox.style.borderColor = "var(--accent-green)";
        }
        
        // Highlight try, except and handler lines
        renderExceptionCode([3, 8, 9, 11], false);
        
        if (explanationCard) {
            explanationCard.style.display = "block";
            explanationCard.style.borderLeftColor = "var(--accent-green)";
            explanationCard.innerHTML = `<strong><i class="fa-solid fa-circle-check" style="color: var(--accent-green); margin-right: 6px;"></i> try-except Recovery:</strong><br>${scenario.explanation}`;
        }
    } else {
        // Run unshielded code (Crashes!)
        if (consoleText) consoleText.textContent = scenario.crashOutput;
        if (consoleStatus) {
            consoleStatus.textContent = "Crashed";
            consoleStatus.style.color = "var(--accent-red)";
        }
        if (consoleBox) {
            consoleBox.style.borderColor = "var(--accent-red)";
            consoleBox.classList.add("type-error-flash");
            setTimeout(() => consoleBox.classList.remove("type-error-flash"), 400);
        }
        
        // Find crash line number
        const crashLineObj = scenario.codeRaw.find(l => l.isCrash);
        const crashLineNum = crashLineObj ? crashLineObj.line : null;
        
        // Highlight line that crashed
        renderExceptionCode(crashLineNum ? [crashLineNum] : [], true);
        
        if (explanationCard) {
            explanationCard.style.display = "block";
            explanationCard.style.borderLeftColor = "var(--accent-red)";
            explanationCard.innerHTML = `<strong><i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-red); margin-right: 6px;"></i> Exception Crash:</strong><br>The program crashed on line ${crashLineNum}. Because there was no <code>try-except</code> shield to catch the <code>${scenario.title}</code>, execution halted immediately. Notice that subsequent lines of code were never reached!`;
        }
    }
}

// Bind to window to allow HTML onClick access
window.switchFlowTab = switchFlowTab;
window.updateGpaBranches = updateGpaBranches;
window.selectLoopType = selectLoopType;
window.stepLoopSimulation = stepLoopSimulation;
window.resetLoopSimulation = resetLoopSimulation;
window.switchExceptionScenario = switchExceptionScenario;
window.setExceptionShieldState = setExceptionShieldState;
window.runExceptionSimulation = runExceptionSimulation;

// Recursion Tree Zoom and Pan Handlers (Figma/Google Maps style viewBox zoom-and-pan)
let viewBoxState = {
    minX: 0,
    minY: 0,
    width: 540,
    height: 240
};
let isPanning = false;
let startPanMouseX = 0;
let startPanMouseY = 0;
let startPanMinX = 0;
let startPanMinY = 0;

function applyViewBox() {
    const svg = document.getElementById("rec-tree-svg");
    if (!svg) return;
    svg.setAttribute("viewBox", `${viewBoxState.minX} ${viewBoxState.minY} ${viewBoxState.width} ${viewBoxState.height}`);
}

function zoomTree(delta) {
    const zoomFactor = delta > 0 ? 0.8 : 1.25;
    
    // Limits viewBox width between 150 (max zoom) and 1000 (min zoom)
    const newWidth = Math.max(150, Math.min(1000, viewBoxState.width * zoomFactor));
    const newHeight = newWidth * (240 / 540); // Keep aspect ratio
    
    // Zoom in relative to current center
    const centerX = viewBoxState.minX + viewBoxState.width / 2;
    const centerY = viewBoxState.minY + viewBoxState.height / 2;
    
    viewBoxState.minX = centerX - newWidth / 2;
    viewBoxState.minY = centerY - newHeight / 2;
    viewBoxState.width = newWidth;
    viewBoxState.height = newHeight;
    
    applyViewBox();
}

function resetTreeZoom() {
    viewBoxState = {
        minX: 0,
        minY: 0,
        width: 540,
        height: 240
    };
    applyViewBox();
}

function setupTreePan() {
    const container = document.getElementById("stack-container");
    if (!container) return;
    
    container.addEventListener("mousedown", (e) => {
        const svg = document.getElementById("rec-tree-svg");
        if (!svg) return;
        
        isPanning = true;
        container.style.cursor = "grabbing";
        startPanMouseX = e.clientX;
        startPanMouseY = e.clientY;
        startPanMinX = viewBoxState.minX;
        startPanMinY = viewBoxState.minY;
    });
    
    window.addEventListener("mousemove", (e) => {
        if (!isPanning) return;
        
        const svg = document.getElementById("rec-tree-svg");
        if (!svg) return;
        
        const deltaMouseX = e.clientX - startPanMouseX;
        const deltaMouseY = e.clientY - startPanMouseY;
        
        const svgClientWidth = svg.clientWidth || 300;
        const svgClientHeight = svg.clientHeight || 200;
        const scaleX = viewBoxState.width / svgClientWidth;
        const scaleY = viewBoxState.height / svgClientHeight;
        
        viewBoxState.minX = startPanMinX - deltaMouseX * scaleX;
        viewBoxState.minY = startPanMinY - deltaMouseY * scaleY;
        
        applyViewBox();
    });
    
    window.addEventListener("mouseup", () => {
        if (isPanning) {
            isPanning = false;
            const container = document.getElementById("stack-container");
            if (container) container.style.cursor = "grab";
        }
    });
}

window.zoomTree = zoomTree;
window.resetTreeZoom = resetTreeZoom;

// Tab switcher for Module 2: Recursion
function switchRecursionTab(tabName) {
    const vizTab = document.getElementById("rec-tab-viz");
    const vsTab = document.getElementById("rec-tab-vs");
    const vizContent = document.getElementById("rec-content-viz");
    const vsContent = document.getElementById("rec-content-vs");
    
    if (!vizTab || !vsTab || !vizContent || !vsContent) return;
    
    if (tabName === "viz") {
        vizTab.classList.add("active");
        vsTab.classList.remove("active");
        vizContent.style.display = "block";
        vsContent.style.display = "none";
    } else {
        vsTab.classList.add("active");
        vizTab.classList.remove("active");
        vsContent.style.display = "block";
        vizContent.style.display = "none";
    }
}
window.switchRecursionTab = switchRecursionTab;

function runStaticCCode(outputId) {
    const outputEl = document.getElementById(outputId);
    if (!outputEl) return;
    
    // Clear previous interval if any
    if (outputEl.dataset.intervalId) {
        clearInterval(parseInt(outputEl.dataset.intervalId));
    }
    
    outputEl.style.display = "block";
    outputEl.innerHTML = "Compiling with gcc...\nRunning program...\n\n";
    
    let finalOutput = "";
    if (outputId === "logic-c-output") {
        finalOutput = "Array resized from 5 to 10 elements.\nOriginal elements preserved.\nMemory safely deallocated.\n\n[Process completed with exit code 0]";
    } else if (outputId === "types-c-output") {
        finalOutput = "Hash function calculated hash 4 for 'Alice'.\nSearching in linked list...\nFound entry: 'Alice' -> 'A'\n\n[Process completed with exit code 0]";
    } else if (outputId === "readability-c-output") {
        finalOutput = "Extracted slice from index 2 to 5:\nslice[0] = 30\nslice[1] = 40\nslice[2] = 50\n\n[Process completed with exit code 0]";
    }
    
    let i = 0;
    const intervalId = setInterval(() => {
        outputEl.innerHTML += finalOutput[i];
        i++;
        if (i >= finalOutput.length) {
            clearInterval(intervalId);
            outputEl.removeAttribute("data-interval-id");
        }
    }, 15);
    
    outputEl.dataset.intervalId = intervalId;
}
window.runStaticCCode = runStaticCCode;

/* ─── Live Editor: Real-time Python Syntax Highlighting ─── */
function highlightPythonSyntax(code) {
    // Escape HTML first
    const escaped = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Apply token patterns using placeholders so generated HTML is not
    // re-processed by later regex passes.
    let result = escaped;
    const tokens = [];

    const stashToken = (html) => {
        const token = `__HL_${tokens.length}__`;
        tokens.push([token, html]);
        return token;
    };

    // 1. Strings (single/double/triple quoted)
    result = result.replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
        (match) => stashToken(`<span style="color:#a3e635">${match}</span>`));

    // 2. Comments (# to end of line) — but not inside already-tagged spans
    result = result.replace(/(#[^\n]*)/g,
        (match) => stashToken(`<span style="color:#6b7280;font-style:italic">${match}</span>`));

    // 3. Keywords
    const keywords = ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while',
        'in', 'not', 'and', 'or', 'import', 'from', 'as', 'with', 'try', 'except',
        'finally', 'raise', 'pass', 'break', 'continue', 'lambda', 'yield',
        'True', 'False', 'None', 'is', 'del', 'global', 'nonlocal', 'assert'];
    const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    result = result.replace(kwRegex, (match) => stashToken(`<span style="color:#ff79c6;font-weight:600">${match}</span>`));

    // 4. Built-in functions
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

    // Restore any stashed spans after all token replacements are done.
    for (let i = tokens.length - 1; i >= 0; i--) {
        const [token, html] = tokens[i];
        result = result.split(token).join(html);
    }

    return result;
}

function autoResizeTextarea(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
    // Also sync the highlight overlay height
    const wrap = ta.closest('.live-editor-highlight-wrap');
    if (wrap) {
        const hl = wrap.querySelector('.live-code-highlight');
        if (hl) hl.style.height = ta.scrollHeight + 'px';
    }
}

function initLiveEditorHighlighting() {
    document.querySelectorAll('.live-code-textarea').forEach(ta => {
        // Wrap in highlight container if not already done
        const parent = ta.parentElement;
        if (parent.classList.contains('live-editor-highlight-wrap')) return;

        // Create wrapper
        const wrap = document.createElement('div');
        wrap.className = 'live-editor-highlight-wrap';

        // Create highlight overlay
        const hlPre = document.createElement('pre');
        hlPre.className = 'live-code-highlight';
        hlPre.setAttribute('aria-hidden', 'true');

        // Insert: wrap replaces textarea, then both go inside wrap
        ta.parentNode.insertBefore(wrap, ta);
        wrap.appendChild(hlPre);
        wrap.appendChild(ta);

        // Mark textarea as having highlight overlay
        ta.classList.add('with-highlight');

        // Sync function
        function syncHighlight() {
            hlPre.innerHTML = highlightPythonSyntax(ta.value);
            // Sync scroll
            hlPre.scrollTop = ta.scrollTop;
            hlPre.scrollLeft = ta.scrollLeft;
            autoResizeTextarea(ta);
        }

        // Initial sync
        syncHighlight();

        // Listen for changes
        ta.addEventListener('input', syncHighlight);
        ta.addEventListener('scroll', () => {
            hlPre.scrollTop = ta.scrollTop;
            hlPre.scrollLeft = ta.scrollLeft;
        });
        ta.addEventListener('keydown', () => setTimeout(syncHighlight, 0));
    });
}

// Initialize after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLiveEditorHighlighting);
} else {
    initLiveEditorHighlighting();
}
