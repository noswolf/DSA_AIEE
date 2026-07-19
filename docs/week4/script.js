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
    // Hide all sections (both content and viz)
    document.querySelectorAll(".content-section, .viz-section").forEach(sec => sec.classList.remove("active"));

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
        // Skip viz-sections (singly and doubly) since React handles their own nav
        if (targetId === 'singly-section' || targetId === 'doubly-section') return;

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
    window.navigateToSection = navigateToSection;
}

// -------------------------------------------------------------
// Transition Quiz Data and Controller
// -------------------------------------------------------------
const quizQuestions = [
    {
        qnum: "Question 1 of 4",
        question: "What is the main advantage of a Linked List over an Array?",
        options: [
            "Random access is faster in a Linked List",
            "A Linked List takes less memory",
            "Dynamic size and easy insertion/deletion without shifting elements",
            "A Linked List allows O(1) access to any index"
        ],
        correct: 2,
        explanation: "Unlike arrays which require contiguous memory and shifting of elements when inserting or deleting, Linked Lists dynamically allocate memory and only require pointer updates for insertion/deletion."
    },
    {
        qnum: "Question 2 of 4",
        question: "In Python, what is the purpose of the 'self' keyword in a class?",
        options: [
            "It defines a private variable",
            "It refers to the current instance of the class",
            "It creates a static method",
            "It acts as a placeholder for inheritance"
        ],
        correct: 1,
        explanation: "The 'self' keyword is used to represent the instance of the class. It allows access to the attributes and methods of the object in Python."
    },
    {
        qnum: "Question 3 of 4",
        question: "In a Doubly Linked List, what does each node contain?",
        options: [
            "Only data and a reference to the next node",
            "Data, a reference to the next node, and a reference to the previous node",
            "Data and a reference to the root node",
            "Only references to the previous and next nodes"
        ],
        correct: 1,
        explanation: "A node in a Doubly Linked List has three parts: the data, a 'next' pointer (to the next node), and a 'prev' pointer (to the previous node), allowing traversal in both directions."
    },
    {
        qnum: "Question 4 of 4",
        question: "What does the super() function do in an object-oriented Python program?",
        options: [
            "It returns a string representation of the object",
            "It creates a new instance of the current class",
            "It gives access to methods in a superclass (parent class)",
            "It deletes the current object from memory"
        ],
        correct: 2,
        explanation: "The super() function is used to call methods from a parent class, which is especially useful for calling the parent's __init__() method within a child class."
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
                        if (i === q.correct) extraClass = " correct";
                        else if (i === prevAnswer) extraClass = " incorrect";
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
                    ${isAnswered && currentQuizIdx < quizQuestions.length - 1 ? `<button class="btn btn-primary" id="quiz-next-btn" onclick="nextQuizQuestion()">Next Question <i class="fa-solid fa-chevron-right"></i></button>` : ''}
                </div>
            </div>
        </div>
    `;
}

function selectQuizOption(optionIdx) {
    userAnswers[currentQuizIdx] = optionIdx;
    loadQuizQuestion();
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
        if (ans === quizQuestions[idx].correct) score++;
    });

    const scoreNum = document.getElementById("quiz-score-num");
    const scoreTotal = document.getElementById("quiz-score-total");
    if (scoreNum) scoreNum.textContent = score;
    if (scoreTotal) scoreTotal.textContent = quizQuestions.length;

    const fbText = document.getElementById("quiz-feedback-text");
    if (fbText) {
        if (score === quizQuestions.length) {
            fbText.textContent = "Perfect score! You've mastered all concepts from Week 4!";
        } else if (score >= 3) {
            fbText.textContent = "Great job! Review the explanations to perfect your knowledge!";
        } else {
            fbText.textContent = "Keep reviewing! Go back through the modules to strengthen your understanding!";
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

// ------------------------------
// Module 1: OOP Quiz
// ------------------------------
const oopQuizQuestions = [
    {
        qnum: "Question 1 of 10",
        question: "In Python, what is the first parameter of every instance method?",
        options: ["this", "self", "cls", "init"],
        correct: 1,
        explanation: "The 'self' keyword refers to the current instance of the class, and it must be the first parameter of any instance method."
    },
    {
        qnum: "Question 2 of 10",
        question: "What convention in Python indicates that a variable should be treated as 'private' (encapsulated)?",
        options: ["double underscore (__var)", "single underscore (_var)", "dollar sign ($var)", "all caps (VAR)"],
        correct: 1,
        explanation: "A single underscore prefix (_var) is a convention to signal that an attribute is intended to be private and shouldn't be accessed directly outside the class."
    },
    {
        qnum: "Question 3 of 10",
        question: "What do you call a method that retrieves the value of a private attribute?",
        options: ["Setter", "Getter", "Constructor", "Destructor"],
        correct: 1,
        explanation: "A 'getter' method is used to safely retrieve the value of a private attribute, allowing controlled access."
    },
    {
        qnum: "Question 4 of 10",
        question: "Which function is used to call a method from a parent class?",
        options: ["parent()", "super()", "call()", "inherit()"],
        correct: 1,
        explanation: "The super() function gives access to methods in a superclass (parent class), and it's commonly used to call the parent's __init__ method."
    },
    {
        qnum: "Question 5 of 10",
        question: "What is the special method that runs when you create an instance of a class?",
        options: ["__new__", "__init__", "__create__", "__main__"],
        correct: 1,
        explanation: "The __init__ method is the constructor that initializes a new object when you create an instance of a class."
    },
    {
        qnum: "Question 6 of 10",
        question: "Which of these best describes encapsulation?",
        options: [
            "Allowing a class to inherit from another",
            "Hiding internal state and exposing it through controlled methods",
            "Creating multiple methods with the same name",
            "Making all attributes public"
        ],
        correct: 1,
        explanation: "Encapsulation means hiding the internal state of an object and only exposing it through well-defined methods (getters/setters) to protect data integrity."
    },
    {
        qnum: "Question 7 of 10",
        question: "If you don't call super().__init__() in a child class's __init__, what happens?",
        options: [
            "The parent class is automatically initialized",
            "The parent's attributes are not initialized, which may cause AttributeErrors",
            "The child class can't inherit any methods",
            "Python throws a syntax error"
        ],
        correct: 1,
        explanation: "Without super().__init__(), the parent class's constructor never runs, so its attributes are never initialized, which often leads to AttributeErrors."
    },
    {
        qnum: "Question 8 of 10",
        question: "What would you use a setter method for?",
        options: [
            "To retrieve an attribute's value",
            "To delete an attribute",
            "To update an attribute's value, often with validation",
            "To create a new instance"
        ],
        correct: 2,
        explanation: "A 'setter' method is used to safely update a private attribute's value, often including validation logic."
    },
    {
        qnum: "Question 9 of 10",
        question: "In Python, can you directly access an attribute with a single underscore from outside the class?",
        options: [
            "No, it's completely private and raises an error",
            "Yes, but it's a convention to not do so",
            "Only if you use the get() function",
            "Only if the class has a public getter"
        ],
        correct: 1,
        explanation: "A single underscore is just a naming convention — you can still access it from outside the class, but you shouldn't as it signals the attribute is intended for internal use."
    },
    {
        qnum: "Question 10 of 10",
        question: "In this code, what is 'self._next'? class Node: def __init__(self, data): self._data = data self._next = None",
        options: [
            "A public attribute",
            "A protected (encapsulated) attribute meant for internal use",
            "A static variable",
            "A global variable"
        ],
        correct: 1,
        explanation: "The single underscore prefix (_next) indicates this is a protected attribute meant to be used only within the class, not accessed directly from outside."
    }
];

let currentOopQuizIdx = 0;
let oopUserAnswers = Array(oopQuizQuestions.length).fill(null);

function loadOopQuizQuestion() {
    const container = document.getElementById("oop-quiz-container");
    if (!container) return;

    if (currentOopQuizIdx >= oopQuizQuestions.length) {
        showOopQuizResults();
        return;
    }

    const q = oopQuizQuestions[currentOopQuizIdx];
    const prevAnswer = oopUserAnswers[currentOopQuizIdx];
    const isAnswered = (prevAnswer !== null);

    container.innerHTML = `
        <div class="quiz-question-card glass">
            <div class="quiz-q-num">${q.qnum}</div>
            <div class="quiz-q-text">${q.question}</div>
            <div class="quiz-options">
                ${q.options.map((opt, i) => {
                    let extraClass = "";
                    if (isAnswered) {
                        if (i === q.correct) extraClass = " correct";
                        else if (i === prevAnswer) extraClass = " incorrect";
                    }
                    return `<button class="quiz-option${extraClass}" ${isAnswered ? 'disabled' : ''} onclick="selectOopQuizOption(${i})">${opt}</button>`;
                }).join('')}
            </div>
            <div class="quiz-explanation ${isAnswered ? (prevAnswer === q.correct ? 'correct-explain' : 'incorrect-explain') : ''}" id="oop-quiz-explanation-box" style="display: ${isAnswered ? 'block' : 'none'};">
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
                    ${currentOopQuizIdx > 0 ? `<button class="btn btn-secondary" id="oop-quiz-prev-btn" onclick="prevOopQuizQuestion()"><i class="fa-solid fa-chevron-left"></i> Back</button>` : ''}
                </div>
                <div>
                    ${currentOopQuizIdx < oopQuizQuestions.length - 1 ? `<button class="btn btn-primary" id="oop-quiz-next-btn" onclick="nextOopQuizQuestion()" style="display: ${isAnswered ? 'inline-flex' : 'none'};">Next Question <i class="fa-solid fa-chevron-right"></i></button>` : ''}
                </div>
            </div>
        </div>
    `;
}

function selectOopQuizOption(optionIdx) {
    oopUserAnswers[currentOopQuizIdx] = optionIdx;
    loadOopQuizQuestion();
}

function nextOopQuizQuestion() {
    currentOopQuizIdx++;
    loadOopQuizQuestion();
}

function prevOopQuizQuestion() {
    if (currentOopQuizIdx > 0) {
        currentOopQuizIdx--;
        loadOopQuizQuestion();
    }
}

function showOopQuizResults() {
    const container = document.getElementById("oop-quiz-container");
    if (container) container.style.display = "none";

    const summaryCard = document.getElementById("oop-quiz-summary-card");
    if (summaryCard) summaryCard.style.display = "flex";

    let score = 0;
    oopUserAnswers.forEach((ans, idx) => {
        if (ans === oopQuizQuestions[idx].correct) score++;
    });

    const scoreNum = document.getElementById("oop-quiz-score-num");
    const scoreTotal = document.getElementById("oop-quiz-score-total");
    if (scoreNum) scoreNum.textContent = score;
    if (scoreTotal) scoreTotal.textContent = oopQuizQuestions.length;

    const fbText = document.getElementById("oop-quiz-feedback-text");
    if (fbText) {
        if (score === oopQuizQuestions.length) {
            fbText.textContent = "Perfect score! You've mastered OOP concepts! Let's move to Linked Lists!";
        } else if (score >= 7) {
            fbText.textContent = "Great job! Review the questions you missed and then dive into Linked Lists!";
        } else {
            fbText.textContent = "Keep practicing! Re-read the OOP Refresher section and try the quiz again!";
        }
    }
}

function resetOopQuiz() {
    currentOopQuizIdx = 0;
    oopUserAnswers = Array(oopQuizQuestions.length).fill(null);

    const summaryCard = document.getElementById("oop-quiz-summary-card");
    const container = document.getElementById("oop-quiz-container");
    if (summaryCard) summaryCard.style.display = "none";
    if (container) container.style.display = "block";

    loadOopQuizQuestion();
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
    loadOopQuizQuestion();
});
