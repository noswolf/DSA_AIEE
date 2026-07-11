// -------------------------------------------------------------
// Pyodide (WASM Python) Initialization and Console Controller
// -------------------------------------------------------------
let pyodideInstance = null;
let currentOutputBuffer = "";

// Helper to support Tab key indentation in textareas
function enableTabIndentation(textarea) {
    if (!textarea) return;
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

        if (statusText) statusText.textContent = "Python Ready (WASM)";
        if (statusDot) statusDot.className = "status-dot ready";
        if (globalConsoleTerminal) globalConsoleTerminal.textContent = ">>> Python Environment Initialized.\n>>> Type code above and click Execute.";

        // Warm up Pyodide with an execution
        await pyodideInstance.runPythonAsync("print('Pyodide engine is active.')");
        currentOutputBuffer = ""; // Reset warm-up logs
    } catch (err) {
        if (statusText) statusText.textContent = "Load Failed";
        if (statusDot) statusDot.className = "status-dot";
        if (globalConsoleTerminal) globalConsoleTerminal.textContent = "Failed to load Python: " + err;
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
        const body = document.querySelector(".content-body");
        if (body) body.scrollTop = 0;
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
    if (navItem && headerTitle) {
        headerTitle.textContent = navItem.innerText.trim();
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
// Transition Quiz Data and Controller
// -------------------------------------------------------------
const quizQuestions = [
    {
        qnum: "Question 1 of 5",
        question: "Which sorting algorithm performs comparisons but only does a maximum of N-1 swaps/exchanges in its execution?",
        options: [
            "Bubble Sort",
            "Selection Sort",
            "Insertion Sort",
            "Merge Sort"
        ],
        correct: 1,
        explanation: "Selection Sort scans the unsorted list to find the minimum element first, and swaps it at most once per round (outer loop). Thus, it does a maximum of N-1 swaps overall, making it efficient when write operations are highly expensive."
    },
    {
        qnum: "Question 2 of 5",
        question: "In Binary Search, if our list contains 64 elements, what is the maximum number of comparisons needed to find the target or determine that it is not in the list?",
        options: [
            "6 comparisons",
            "7 comparisons",
            "32 comparisons",
            "64 comparisons"
        ],
        correct: 1,
        explanation: "Binary Search splits the search space in half at each step. For 64 elements, the height of the decision tree is log₂(64) = 6 levels. In the worst case, we make up to log₂ N + 1 comparisons, which equals 7 comparisons."
    },
    {
        qnum: "Question 3 of 5",
        question: "What is the primary advantage of Merge Sort over Bubble, Selection, and Insertion Sort?",
        options: [
            "It is in-place and does not require extra memory.",
            "It is always faster for tiny lists of size N < 5.",
            "It has a guaranteed worst-case time complexity of O(N log N).",
            "It is simpler to write and doesn't use recursion."
        ],
        correct: 2,
        explanation: "Merge Sort splits lists recursively and merges them in linear time. It guarantees a worst-case time complexity of O(N log N). In contrast, Bubble, Selection, and Insertion Sort all degrade to O(N²) in the worst case."
    },
    {
        qnum: "Question 4 of 5",
        question: "Using Linear Probing (Open Addressing) in a Hash Table, what happens in insertData_alternative if the target hash index is occupied?",
        options: [
            "It appends the key-value pair to a linked list at that index.",
            "It raises a KeyError immediately.",
            "It increments the index by 1 (modulo table size) and checks the next slot, repeating until it finds an empty slot.",
            "It doubles the size of the bucket array."
        ],
        correct: 2,
        explanation: "Linear probing resolves collisions by checking index+1, index+2, etc. (with modulo wrap-around) until an empty cell is found to insert the data. This is open addressing."
    },
    {
        qnum: "Question 5 of 5",
        question: "What is the time complexity of searching a key in a Hash Table under the best-case scenario (no collisions)?",
        options: [
            "O(1)",
            "O(log N)",
            "O(N)",
            "O(N log N)"
        ],
        correct: 0,
        explanation: "Under the best-case scenario with no collisions, the hash function directly points to the correct bucket, and we retrieve the element in a single step, resulting in O(1) constant time."
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
            <div class="quiz-q-num">${q.qnum}</div>
            <div class="quiz-q-text">${q.question}</div>
            <div class="quiz-options">
                ${q.options.map((opt, i) => {
                    let extraClass = "";
                    if (isAnswered) {
                        if (i === q.correct) {
                            extraClass = " correct";
                        } else if (i === prevAnswer) {
                            extraClass = " incorrect";
                        }
                    }
                    return `<button class="quiz-option${extraClass}" ${isAnswered ? 'disabled' : ''} onclick="selectQuizOption(${i})">${opt}</button>`;
                }).join('')}
            </div>
            <div class="quiz-explanation ${isAnswered ? (prevAnswer === q.correct ? 'correct-explain' : 'incorrect-explain') : ''}" id="quiz-explanation-box" style="display: ${isAnswered ? 'block' : 'none'};">
                ${isAnswered ? `
                    <h5 class="${prevAnswer === q.correct ? 'correct-title' : 'incorrect-title'}">
                        <i class="fa-solid ${prevAnswer === q.correct ? 'fa-circle-check' : 'fa-circle-xmark'}"></i> 
                        ${prevAnswer === q.correct ? 'Correct!' : 'Incorrect'}
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

    // Disable all options
    options.forEach(opt => opt.disabled = true);

    // Save selection
    userAnswers[currentQuizIdx] = optionIdx;
    const isCorrect = (optionIdx === q.correct);

    // Highlight options
    options.forEach((opt, idx) => {
        if (idx === q.correct) {
            opt.classList.add("correct");
        } else if (idx === optionIdx) {
            opt.classList.add("incorrect");
        }
    });

    // Render explanation
    const explainBox = document.getElementById("quiz-explanation-box");
    if (explainBox) {
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
    }

    // Show Next Button
    const nextBtn = document.getElementById("quiz-next-btn");
    if (nextBtn) nextBtn.style.display = "inline-flex";
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

function showQuizResults() {
    const container = document.getElementById("quiz-container");
    if (container) container.style.display = "none";

    const summaryCard = document.getElementById("quiz-summary-card");
    if (summaryCard) summaryCard.style.display = "flex";

    // Compute Score
    let score = 0;
    userAnswers.forEach((ans, idx) => {
        if (ans === quizQuestions[idx].correct) {
            score++;
        }
    });

    const scoreNum = document.getElementById("quiz-score-num");
    const scoreTotal = document.getElementById("quiz-score-total");
    if (scoreNum) scoreNum.textContent = score;
    if (scoreTotal) scoreTotal.textContent = quizQuestions.length;

    const fbText = document.getElementById("quiz-feedback-text");
    if (fbText) {
        if (score === quizQuestions.length) {
            fbText.textContent = "Spectacular! You've mastered all the searching, sorting, and hashing concepts of Week 3!";
        } else if (score >= 3) {
            fbText.textContent = "Great job! You have a solid understanding of searching bounds, sorting swaps, and linear probing. Review the explanations to perfect your knowledge.";
        } else {
            fbText.textContent = "Keep reviewing! Understanding how binary search halves space, how selection sort minimizes swaps, and how open addressing rehashes is key to advanced DSA.";
        }
    }
}

function resetQuiz() {
    currentQuizIdx = 0;
    userAnswers = Array(quizQuestions.length).fill(null);

    const summaryCard = document.getElementById("quiz-summary-card");
    const container = document.getElementById("quiz-container");
    if (summaryCard) summaryCard.style.display = "none";
    if (container) container.style.display = "block";

    loadQuizQuestion();
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
        if (consoleDrawer) consoleDrawer.classList.toggle("expanded");
    };

    if (toggleConsoleBtn) toggleConsoleBtn.addEventListener("click", toggleDrawer);
    if (minimizeConsoleBtn) minimizeConsoleBtn.addEventListener("click", toggleDrawer);

    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener("click", () => {
            const term = document.getElementById("global-console-terminal");
            if (term) term.textContent = "Console cleared.\n";
        });
    }

    if (runConsoleBtn) {
        runConsoleBtn.addEventListener("click", async () => {
            const consoleTextarea = document.getElementById("global-console-textarea");
            const consoleTerminal = document.getElementById("global-console-terminal");
            if (consoleTerminal && consoleTextarea) {
                consoleTerminal.textContent = "Running...\n";
                const result = await runPythonCode(consoleTextarea.value);
                consoleTerminal.textContent = result || ">>> Code executed with no printed output.";
            }
        });
    }

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

    // Run core initializers
    initPyodide();
    setupSectionNavigation();
    loadQuizQuestion();
});
