/* Final Exam Guide: interactive widgets (vanilla JS, no build step) */
(() => {
    'use strict';

    const store = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
    };
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const chips = (arr, cls = () => '') => arr.map((x, i) => `<span class="chip ${cls(x, i)}">${x}</span>`).join('');
    const lane = (title, inner) => `<div class="lane"><span class="lane-title">${title}</span>${inner}</div>`;
    const boxes = (n, vals, cls = () => 'filled') =>
        `<div class="boxes">${Array.from({ length: n }, (_, i) =>
            `<span class="box ${vals[i] != null ? cls(i) : ''}" data-i="${i + 1}">${vals[i] ?? ''}</span>`).join('')}</div>`;
    // Projector "walk mode": the quiz row (Undo / Clear / Check) becomes these step buttons
    const walkRow = (i, n) => `<div class="quiz-row walk-row">
        <button type="button" class="btn btn-secondary" data-w="prev" ${i === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-left"></i><span>Back</span></button>
        <span class="count">${i + 1} / ${n}</span>
        <button type="button" class="btn btn-part" data-w="next" ${i === n - 1 ? 'disabled' : ''}><span>Next step</span><i class="fa-solid fa-arrow-right"></i></button>
        <button type="button" class="btn btn-secondary" data-w="end" ${i === n - 1 ? 'disabled' : ''}><i class="fa-solid fa-forward-step"></i><span>Full answer</span></button></div>`;
    const stepTip = (i, n, caption) => `<div class="tip"><i class="fa-solid fa-list-ol"></i><div><b>${i === n - 1 ? 'RESULT' : 'STEP ' + (i + 1)}</b> · ${caption}</div></div>`;

    /* ═════════════ Shell: navigation, theme, sidebar, answers ═════════════ */
    function initShell() {
        const navItems = $$('.nav-item');
        const sections = $$('.content-section');
        const title = $('#current-section-title');

        window.showSection = (id) => {
            const target = document.getElementById(id);
            if (!target) return;
            sections.forEach(s => s.classList.toggle('active', s === target));
            navItems.forEach(n => n.classList.toggle('active', n.dataset.target === id));
            const nav = navItems.find(n => n.dataset.target === id);
            if (nav) title.textContent = nav.dataset.title;
            const projBtn = $('#projector-btn');
            if (projBtn) projBtn.hidden = !['part-c', 'part-d'].includes(id);
            $('.content-body').scrollTop = 0;
            window.scrollTo(0, 0);
            history.replaceState(null, '', '#' + id);
        };
        navItems.forEach(n => {
            n.title = n.dataset.title;  // tooltip, so the icon-only collapsed sidebar is still readable
            n.addEventListener('click', () => showSection(n.dataset.target));
        });
        $$('[data-goto]').forEach(b => b.addEventListener('click', () => showSection(b.dataset.goto)));

        // Previous / Next section at the bottom of Part A–D (follows the sidebar order, like week 7)
        const order = navItems.map(n => n.dataset.target);
        ['part-a', 'part-b', 'part-c', 'part-d'].forEach(id => {
            const sec = document.getElementById(id), at = order.indexOf(id);
            if (!sec || at < 0) return;
            // Same markup as week 7: week6/styles.css styles .section-nav-footer and .sec-nav-btn
            const btn = (to, dir) => {
                const n = navItems[to];
                if (!n) return '<div></div>';
                const label = dir === 'prev' ? '<i class="fa-solid fa-arrow-left"></i> Previous Section' : 'Next Section <i class="fa-solid fa-arrow-right"></i>';
                return `<button type="button" class="sec-nav-btn ${dir}-btn" data-sec="${n.dataset.target}"><span class="nav-label">${label}</span><span class="nav-title">${n.dataset.title}</span></button>`;
            };
            const nav = document.createElement('div');
            nav.className = 'section-nav-footer';
            nav.innerHTML = btn(at - 1, 'prev') + btn(at + 1, 'next');
            nav.addEventListener('click', (e) => {
                const b = e.target.closest('[data-sec]');
                if (b) showSection(b.dataset.sec);
            });
            sec.append(nav);
        });
        const start = location.hash.slice(1);
        if (start && document.getElementById(start)) showSection(start);

        const themeBtn = $('#theme-toggle-btn');
        const applyTheme = (light) => {
            document.body.classList.toggle('light-mode', light);
            themeBtn.innerHTML = light ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
        };
        applyTheme(store.get('dsa-final-theme') !== 'dark');
        themeBtn.addEventListener('click', () => {
            const light = !document.body.classList.contains('light-mode');
            applyTheme(light);
            store.set('dsa-final-theme', light ? 'light' : 'dark');
        });

        $('#sidebar-toggle-btn').addEventListener('click', () => $('.app-container').classList.toggle('collapsed'));

        // Hidden answers
        $$('.reveal').forEach(r => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'reveal-btn';
            btn.innerHTML = `<span class="eye"><i class="fa-solid fa-eye"></i></span>
                <span><span class="rb-text"></span><br><span class="hint">Solve it on paper first, then check.</span></span>
                <i class="fa-solid fa-chevron-down rb-arrow" style="margin-left:auto"></i>`;
            r.prepend(btn);
            btn.addEventListener('click', () => setReveal(r, !r.classList.contains('open')));
            setReveal(r, false);
        });
        const ansBtn = $('#answers-toggle');
        let allOpen = false;
        ansBtn.addEventListener('click', () => {
            allOpen = !allOpen;
            $$('.reveal').forEach(r => setReveal(r, allOpen));
            ansBtn.classList.toggle('on', allOpen);
            ansBtn.innerHTML = allOpen
                ? '<i class="fa-solid fa-eye-slash"></i><span>Hide all answers</span>'
                : '<i class="fa-solid fa-eye"></i><span>Show all answers</span>';
        });

        // Self-check list (remembered per browser)
        $$('.checklist input').forEach(cb => {
            const key = 'dsa-final-check-' + cb.dataset.k;
            cb.checked = store.get(key) === '1';
            cb.addEventListener('change', () => store.set(key, cb.checked ? '1' : '0'));
        });
    }

    function setReveal(r, open) {
        r.classList.toggle('open', open);
        const label = r.dataset.label || 'Show answer';
        $('.rb-text', r).textContent = open ? 'Hide answer' : label;
        $('.eye i', r).className = open ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        $('.rb-arrow', r).style.transform = open ? 'rotate(180deg)' : '';
    }

    /* ═════════════ Generic step-through player ═════════════ */
    // hooks (optional): before() runs just before the view is redrawn, after(step) right after.
    function stepper(root, steps, draw, hooks = {}) {
        root.classList.add('stepper');
        root.innerHTML = `
            <div class="stepper-caption"><span class="step-num"></span><span class="cap"></span></div>
            <div class="stepper-progress"><div></div></div>
            <div class="stepper-view"></div>
            <div class="stepper-controls">
                <button type="button" class="btn btn-secondary" data-a="reset" title="Back to step 1"><i class="fa-solid fa-rotate-left"></i></button>
                <button type="button" class="btn btn-secondary" data-a="prev"><i class="fa-solid fa-arrow-left"></i><span>Back</span></button>
                <span class="count"></span>
                <button type="button" class="btn btn-part" data-a="next"><span>Next step</span><i class="fa-solid fa-arrow-right"></i></button>
            </div>`;
        let i = 0;
        const render = () => {
            const s = steps[i];
            const last = i === steps.length - 1;
            $('.step-num', root).textContent = last ? 'RESULT' : 'STEP ' + (i + 1);
            if (hooks.before) hooks.before();
            $('.cap', root).innerHTML = s.caption;
            $('.stepper-view', root).innerHTML = draw(s, i);
            if (hooks.after) hooks.after(s);
            $('.stepper-progress div', root).style.width = ((i + 1) / steps.length * 100) + '%';
            $('.count', root).textContent = `${i + 1} / ${steps.length}`;
            $('[data-a=prev]', root).disabled = i === 0;
            $('[data-a=reset]', root).disabled = i === 0;
            $('[data-a=next]', root).disabled = last;
        };
        root.onclick = (e) => {
            const b = e.target.closest('[data-a]');
            if (!b) return;
            if (b.dataset.a === 'next') i = Math.min(i + 1, steps.length - 1);
            else if (b.dataset.a === 'prev') i = Math.max(0, i - 1);
            else i = 0;
            render();
        };
        render();
    }

    /* ═════════════ Part A: queues & stacks ═════════════ */
    // One step per queue operation: every pass is a dequeue then an enqueue, every round ends with an eliminating dequeue.
    function potatoSteps(names, k) {
        const q = [...names], out = [], log = [], steps = [];
        let deq = 0, enq = 0, round = 1;
        const snap = (extra) => steps.push({ q: [...q], out: [...out], log: [...log], deq, enq, k, ...extra });
        const record = (op, who) => log.push({ round, op, who, q: [...q] });
        snap({ round: 0, caption: `Start. The <b>front</b> of the queue is on the left. Each round: pass ${k} times (each pass = <code>dequeue</code> + <code>enqueue</code>), then <code>dequeue</code> the person at the front: they are out.` });
        while (q.length > 1) {
            for (let p = 1; p <= k; p++) {
                const x = q.shift(); deq++;
                record('dequeue', x);
                snap({ round, pass: p, hand: x, op: 'dequeue', who: x,
                    caption: `Round ${round} · pass ${p} of ${k}: <code>dequeue()</code> → <b>${x}</b> leaves the front, holding the potato.` });
                q.push(x); enq++;
                record('enqueue', x);
                snap({ round, pass: p, op: 'enqueue', who: x,
                    caption: `Round ${round} · pass ${p} of ${k}: <code>enqueue(${x})</code> → <b>${x}</b> joins the rear and passes the potato on.` });
            }
            const e = q.shift(); deq++; out.push(e);
            record('eliminate', e);
            snap({ round, op: 'eliminate', who: e,
                caption: `Round ${round}: ${k} passes done. <code>dequeue()</code> → <b>${e}</b> is at the front, so <b>${e} is out</b> (no enqueue).` });
            round++;
        }
        const last = steps[steps.length - 1];
        last.win = q[0];
        last.caption += ` Only <b>${q[0]}</b> is left → <b>winner</b>. Total: <b>${deq} dequeues</b>, ${enq} enqueues.`;
        return steps;
    }

    const OP_LABEL = {
        dequeue: who => `<code>dequeue()</code> → ${who}`,
        enqueue: who => `<code>enqueue(${who})</code>`,
        eliminate: who => `<code>dequeue()</code> → ${who} <b>OUT</b>`
    };

    // Collapsible "Operation history" table. head: column titles, row: (entry) => the <td> cells.
    function historyPanel(log, head, row, open) {
        const rows = log.map((e, i) => `<tr class="${i === log.length - 1 ? 'hl' : ''}"><td class="c">${i + 1}</td>${row(e)}</tr>`).join('');
        return `<details class="history" ${open ? 'open' : ''}>
            <summary><i class="fa-solid fa-clock-rotate-left"></i> Operation history <span class="hist-count">${log.length} so far</span></summary>
            <div class="hist-scroll">${log.length
                ? `<table class="g-table"><tr><th class="c">#</th>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows}</table>`
                : '<div class="lane-end" style="padding:10px">No operations yet. Press Next step.</div>'}</div>
        </details>`;
    }

    // Stepper whose draw(step, historyOpen) includes a historyPanel: keeps it open across steps
    // and scrolls the newest row into view.
    function withHistory(el, steps, draw, hooks = {}) {
        let open = false;
        const showLatest = () => {
            const box = $('.hist-scroll', el);
            if (box) box.scrollTop = box.scrollHeight;
        };
        el.addEventListener('toggle', (e) => {
            if (!e.target.matches('details.history')) return;
            open = e.target.open;
            if (open) showLatest();
        }, true);
        stepper(el, steps, (s) => draw(s, open), hooks);
        el.addEventListener('click', (e) => { if (e.target.closest('[data-a]')) showLatest(); });
    }

    const potatoHistory = (s, open) => historyPanel(s.log, ['Round', 'Operation', 'Queue after (front → rear)'],
        e => `<td class="c">${e.round}</td><td><span class="op-tag ${e.op}">${OP_LABEL[e.op](e.who)}</span></td><td class="mono">${e.q.join(', ') || '(empty)'}</td>`, open);

    // Every person chip carries data-p so potatoWidget can animate it from its old spot to its new one.
    const person = (name, cls = '', tag = '') =>
        `<span class="chip ${cls}" data-p="${name}"${tag ? ` data-tag="${tag}"` : ''}>${name}</span>`;

    function drawPotato(s, histOpen) {
        const now = s.op
            ? `<span class="op-tag ${s.op}">${OP_LABEL[s.op](s.who)}</span><span class="lane-end">Round ${s.round}${s.pass ? ` · pass ${s.pass} of ${s.k}` : ' · elimination'}</span>`
            : '<span class="lane-end">Ready to start</span>';
        const queue = s.q.map((x, i) => {
            if (s.win) return person(x, 'win', 'winner');
            if (s.op === 'enqueue' && i === s.q.length - 1) return person(x, 'new', 'enqueue');
            return person(x, i === 0 ? 'front' : '');
        }).join('');
        const hand = s.hand ? person(s.hand, 'moved', 'dequeue') : '<span class="chip slot-empty">empty</span>';
        const out = s.out.map((x, i) =>
            person(x, 'out', s.op === 'eliminate' && i === s.out.length - 1 ? 'out' : '')).join('');
        return [
            lane('Operation', now),
            `<div class="potato-track">
                <div class="hand-slot"><span class="slot-label">holding potato</span>${hand}</div>
                <span class="track-gap"><i class="fa-solid fa-arrow-left"></i></span>
                <div class="lane"><span class="lane-end">front</span>${queue}<span class="lane-end">rear</span></div>
            </div>`,
            lane('Eliminated', s.out.length ? out : '<span class="lane-end">nobody yet</span>'),
            lane('Count', `<span class="chip cur">${s.deq}</span><span class="lane-end">dequeues</span><span class="chip">${s.enq}</span><span class="lane-end">enqueues</span>`),
            `<div class="legend"><span><i class="sw" style="border-color:var(--accent-blue)"></i>front</span>
             <span><i class="sw" style="border-color:var(--accent-orange);background:var(--bg-orange-light)"></i>just dequeued</span>
             <span><i class="sw" style="border-color:var(--accent-green);background:var(--bg-green-light)"></i>just enqueued</span>
             <span><i class="sw" style="border-color:var(--accent-red);background:var(--bg-red-light)"></i>eliminated</span></div>`,
            potatoHistory(s, histOpen)
        ].join('');
    }

    // Hot Potato stepper with history and person-by-person animation.
    function potatoWidget(el, names, k) {
        // FLIP animation: remember where each person was, redraw, then glide them from old to new spot.
        // The person being moved arcs upward so the eye can follow them over the queue.
        let before = null;
        const positions = () => {
            const view = $('.stepper-view', el);
            if (!view) return new Map();
            const o = view.getBoundingClientRect();
            return new Map($$('[data-p]', view).map(c => {
                const r = c.getBoundingClientRect();
                return [c.dataset.p, { x: r.left - o.left, y: r.top - o.top }];
            }));
        };
        const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const hooks = {
            before: () => { before = reduced ? null : positions(); },
            after: (s) => {
                if (!before || !before.size) return;
                const now = positions();
                $$('[data-p]', $('.stepper-view', el)).forEach(c => {
                    const a = before.get(c.dataset.p), b = now.get(c.dataset.p);
                    if (!a || !b) return;
                    const dx = a.x - b.x, dy = a.y - b.y;
                    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
                    const mover = c.dataset.p === s.who;
                    const lift = mover ? -38 : 0;
                    c.animate([
                        { transform: `translate(${dx}px, ${dy}px)` },
                        { transform: `translate(${dx / 2}px, ${dy / 2 + lift}px)`, offset: 0.5 },
                        { transform: 'translate(0, 0)' }
                    ], { duration: mover ? 750 : 450, easing: 'ease-in-out' });
                });
            }
        };
        withHistory(el, potatoSteps(names, k), drawPotato, hooks);
    }

    function potatoTable(names, k) {
        const q = [...names];
        let rows = '', round = 1;
        while (q.length > 1) {
            const moved = [];
            for (let p = 0; p < k; p++) { const x = q.shift(); q.push(x); moved.push(x); }
            const after = q.join(', ');
            const e = q.shift();
            rows += `<tr><td class="c">${round++}</td><td>${moved.join(', ')}</td><td>${after}</td><td><b style="color:var(--accent-red)">${e}</b></td><td>${q.join(', ')}</td></tr>`;
        }
        return `<div class="table-wrap"><table class="g-table"><tr><th class="c">Round</th><th>${k} passes (moved to rear)</th><th>Queue after passes</th><th>Out</th><th>Queue after round</th></tr>${rows}</table></div>`;
    }

    function stackSteps(ops) {
        const st = [], popped = [], log = [];
        const steps = [{ st: [], popped: [], log: [], caption: 'Empty stack. The <b>top</b> is on the right.' }];
        ops.forEach(op => {
            const m = op.match(/push\((\d+)\)/);
            let cap, val;
            if (m) { val = m[1]; st.push(val); cap = `<code>${op}</code> → put <b>${val}</b> on top.`; }
            else { val = st.pop(); popped.push(val); cap = `<code>${op}</code> → take the top: <b>${val}</b>.`; }
            log.push({ op: m ? 'push' : 'pop', val, st: [...st] });
            steps.push({ st: [...st], popped: [...popped], log: [...log], op: m ? 'push' : 'pop', val, caption: cap });
        });
        const last = steps[steps.length - 1];
        last.caption += ` Popped: <b>${popped.join(', ')}</b>. Left (bottom → top): <b>[${st.join(', ')}]</b>.`;
        return steps;
    }
    const STACK_OP = { push: v => `<code>push(${v})</code>`, pop: v => `<code>pop()</code> → ${v}` };
    const drawStack = (s, open) =>
        lane('Operation', s.op ? `<span class="op-tag ${s.op}">${STACK_OP[s.op](s.val)}</span>` : '<span class="lane-end">Ready to start</span>') +
        lane('Stack', `<span class="lane-end">bottom</span>${chips(s.st, (x, i) => i === s.st.length - 1 ? 'cur' : '')}<span class="lane-end">top</span>`) +
        lane('Popped (in order)', s.popped.length ? chips(s.popped, () => 'out') : '<span class="lane-end">none yet</span>') +
        historyPanel(s.log, ['Operation', 'Stack after (bottom → top)'],
            e => `<td><span class="op-tag ${e.op}">${STACK_OP[e.op](e.val)}</span></td><td class="mono">${e.st.length ? `[${e.st.join(', ')}]` : '(empty)'}</td>`, open);

    function bracketSteps(str) {
        const pairs = { ')': '(', ']': '[', '}': '{' };
        const st = [], log = [];
        const steps = [{ i: -1, st: [], log: [], caption: 'Read left to right. Open bracket → push. Close bracket → pop and it must match.' }];
        const add = (i, act, text, caption) => {
            log.push({ ch: i < str.length ? str[i] : 'end', act, text, st: [...st] });
            steps.push({ i, st: [...st], log: [...log], act, text, caption });
        };
        let ok = true;
        [...str].forEach((c, i) => {
            if (!ok) return;
            if (pairs[c]) {
                const top = st.pop();
                if (top === pairs[c]) add(i, 'pop', `<code>pop()</code> → ${top} matches ${c}`, `<code>${c}</code> closes <code>${top}</code> → match, pop.`);
                else { ok = false; add(i, 'bad', `<code>pop()</code> → ${top ?? 'nothing'}, no match`, `<code>${c}</code> does not match → <b>not balanced</b>.`); }
            } else {
                st.push(c);
                add(i, 'push', `<code>push(${c})</code>`, `<code>${c}</code> is an open bracket → push.`);
            }
        });
        if (ok) {
            if (st.length) add(str.length, 'bad', `stack still holds ${st.join(' ')}`, `End of input, but the stack still holds <code>${st.join(' ')}</code> → <b>not balanced</b>.`);
            else add(str.length, 'push', 'stack empty', 'End of input and the stack is empty → <b>balanced</b>.');
        }
        steps.forEach(x => { x.str = str; });
        return steps;
    }
    const drawBracket = (s, open) =>
        lane('Operation', s.act ? `<span class="op-tag ${s.act}">${s.text}</span>` : '<span class="lane-end">Ready to start</span>') +
        lane('Input', chips([...s.str], (x, i) => i === s.i ? 'cur' : (i < s.i ? 'dim' : ''))) +
        lane('Stack', `<span class="lane-end">bottom</span>${s.st.length ? chips(s.st) : '<span class="lane-end">(empty)</span>'}<span class="lane-end">top</span>`) +
        historyPanel(s.log, ['Read', 'Action', 'Stack after (bottom → top)'],
            e => `<td class="c mono"><b>${e.ch}</b></td><td><span class="op-tag ${e.act}">${e.text}</span></td><td class="mono">${e.st.length ? e.st.join(' ') : '(empty)'}</td>`, open);

    /* ═════════════ Trees: layout & drawing ═════════════ */
    const cloneTree = (n) => n ? { k: n.k, l: cloneTree(n.l), r: cloneTree(n.r) } : null;

    function drawTree(root, cls = () => '', opts = {}) {
        if (!root) return '<div class="lane-end" style="padding:20px">(empty tree)</div>';
        const pos = new Map();
        let x = 0, maxD = 0;
        (function walk(n, d) {
            if (!n) return;
            walk(n.l, d + 1); pos.set(n, { x: x++, d }); maxD = Math.max(maxD, d); walk(n.r, d + 1);
        })(root, 0);
        const dx = opts.dx || 70, dy = 72, pad = 40;
        const X = n => pad + pos.get(n).x * dx, Y = n => 30 + pos.get(n).d * dy;
        const W = pad * 2 + (x - 1) * dx + 8, H = 60 + maxD * dy;
        let edges = '', nodes = '';
        pos.forEach((_, n) => {
            [['l', 'L'], ['r', 'R']].forEach(([side, tag]) => {
                const c = n[side];
                if (!c) return;
                const on = c.slot ? 'slot' : opts.pathEdge && opts.pathEdge(n.k, c.k) ? 'on' : '';
                edges += `<line class="edge ${on}" x1="${X(n)}" y1="${Y(n)}" x2="${X(c)}" y2="${Y(c)}"/>`;
                if (opts.lr) {
                    const mx = (X(n) + X(c)) / 2 + (side === 'l' ? -9 : 9), my = (Y(n) + Y(c)) / 2 - 4;
                    edges += `<text class="elbl" x="${mx}" y="${my}">${tag}</text>`;
                }
            });
        });
        pos.forEach((_, n) => {
            // Empty spot a key can be placed in (BST builder): dashed "+" button.
            if (n.slot) {
                nodes += `<g class="node slot" data-slot="${n.slot}" role="button" aria-label="Empty spot"><rect x="${X(n) - 15}" y="${Y(n) - 13}" width="30" height="26" rx="13"/><text x="${X(n)}" y="${Y(n)}">+</text></g>`;
                return;
            }
            const w = Math.max(42, String(n.k).length * 9 + 20);
            const o = opts.order && opts.order[n.k];
            const delay = o && opts.stagger ? ` style="animation-delay:${(o - 1) * opts.stagger}s"` : '';
            const ord = o ? `<g class="ord-g${opts.stagger ? ' stagger' : ''}"${delay}><circle class="ord-bg" cx="${X(n) + w / 2 - 2}" cy="${Y(n) - 15}" r="9"/><text class="ord" x="${X(n) + w / 2 - 2}" y="${Y(n) - 15}">${o}</text></g>` : '';
            nodes += `<g class="node ${cls(n.k)}" data-k="${n.k}"><rect x="${X(n) - w / 2}" y="${Y(n) - 16}" width="${w}" height="32" rx="16"/><text x="${X(n)}" y="${Y(n)}">${n.k}</text>${ord}</g>`;
        });
        return `<svg class="viz" viewBox="0 0 ${W} ${H}" style="max-width:${W * 1.25}px">${edges}${nodes}</svg>`;
    }

    /* ═════════════ Part B: BST ═════════════ */
    const cmp = (a, b) => typeof a === 'number' ? a - b : (a < b ? -1 : a > b ? 1 : 0);
    // Index of the first letter where two strings differ (the letter that decides the comparison).
    const diffAt = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
    function markWord(w, i) {
        if (typeof w === 'number') return `<b>${w}</b>`;
        if (i >= w.length) return `<b>${w}</b>`;
        return `<b><span class="same">${w.slice(0, i)}</span><mark>${w[i]}</mark>${w.slice(i + 1)}</b>`;
    }
    // One comparison row: "key vs node", the deciding letter highlighted, and where to go next.
    function cmpRow(a, b, go) {
        const c = cmp(a, b), sign = c < 0 ? '&lt;' : c > 0 ? '&gt;' : '=';
        const i = typeof a === 'number' ? 0 : diffAt(a, b);
        const why = typeof a === 'number' || c === 0 ? '' : `${a[i] ?? 'end'} ${sign} ${b[i] ?? 'end'}`;
        return { node: b, go, html: `${markWord(a, i)} <span class="cmp-sign">${sign}</span> ${markWord(b, i)}`, why };
    }
    const GO = {
        left: '<i class="fa-solid fa-arrow-down-long" style="transform:rotate(45deg)"></i> left',
        right: 'right <i class="fa-solid fa-arrow-down-long" style="transform:rotate(-45deg)"></i>',
        dup: 'duplicate', found: 'found', place: 'place', succ: 'successor', info: ''
    };

    function bstSteps(keys, opts = {}) {
        let root = null;
        const steps = [];
        keys.forEach((key, idx) => {
            const path = [], rows = [];
            let dup = false, head;
            if (!root) {
                root = { k: key };
                rows.push({ go: 'place', html: `The tree is empty → <b>${key}</b> becomes the root.` });
                head = `Insert <b>${key}</b> → it is the <b>root</b>`;
            } else {
                let cur = root;
                for (;;) {
                    path.push(cur.k);
                    const c = cmp(key, cur.k);
                    if (c === 0) {
                        rows.push(cmpRow(key, cur.k, 'dup'));
                        rows.push({ go: 'dup', html: `<b>${key}</b> is already in the tree → <b>do not insert</b>.` });
                        head = `Insert <b>${key}</b> → <b>duplicate, ignored</b>`;
                        dup = true;
                        break;
                    }
                    const side = c < 0 ? 'l' : 'r';
                    rows.push(cmpRow(key, cur.k, c < 0 ? 'left' : 'right'));
                    if (!cur[side]) {
                        cur[side] = { k: key };
                        const where = `${c < 0 ? 'left' : 'right'} child of <b>${cur.k}</b>`;
                        rows.push({ go: 'place', html: `Empty spot → <b>${key}</b> becomes the ${where}.` });
                        head = `Insert <b>${key}</b> → ${where}`;
                        break;
                    }
                    cur = cur[side];
                }
            }
            steps.push({ tree: cloneTree(root), path, rows, mark: dup ? { dup: key } : { add: key }, keys, done: idx, caption: head });
        });
        if (opts.search != null) {
            const path = [], rows = [];
            let cur = root;
            while (cur) {
                path.push(cur.k);
                const c = cmp(opts.search, cur.k);
                rows.push(cmpRow(opts.search, cur.k, c === 0 ? 'found' : c < 0 ? 'left' : 'right'));
                if (c === 0) break;
                cur = c < 0 ? cur.l : cur.r;
            }
            rows.push({ go: 'found', html: `Count every comparison, including the match: <b>${path.length}</b>.` });
            steps.push({ tree: cloneTree(root), path, rows, mark: { found: opts.search }, keys, done: keys.length,
                caption: `Search <b>${opts.search}</b> → found after <b>${path.length} comparisons</b>` });
        }
        if (opts.deleteRoot) {
            const r = root, sp = [r.r.k];
            let parent = r, s = r.r;
            while (s.l) { parent = s; s = s.l; sp.push(s.k); }
            const rows = [
                { go: 'info', html: `<b>${r.k}</b> has 2 children → replace it with the <b>smallest key in its right subtree</b>.` },
                { node: sp[0], go: 'right', html: `Go right once → <b>${sp[0]}</b>` },
                ...sp.slice(1).map(k => ({ node: k, go: 'left', html: `Go left → <b>${k}</b>` })),
                { go: 'succ', html: `<b>${s.k}</b> has no left child → successor = <b>${s.k}</b>` }
            ];
            steps.push({ tree: cloneTree(root), path: [r.k, ...sp], rows, mark: { gone: r.k, succ: s.k }, keys, done: keys.length,
                caption: `Delete <b>${r.k}</b> → successor is <b>${s.k}</b>` });
            const old = r.k, child = s.r ? s.r.k : null;
            if (parent === r) parent.r = s.r; else parent.l = s.r;
            r.k = s.k;
            const rows2 = [{ go: 'place', html: `<b>${s.k}</b> moves up into ${old}'s place.` }];
            if (child != null) rows2.push({ go: 'place', html: `${s.k}'s right child <b>${child}</b> moves up into ${s.k}'s old place.` });
            rows2.push({ go: 'place', html: `New root = <b>${s.k}</b>.` });
            steps.push({ tree: cloneTree(root), path: [], rows: rows2, mark: { add: s.k }, keys, done: keys.length,
                caption: `<b>${s.k}</b> replaces ${old} → new root <b>${s.k}</b>` });
        }
        return steps;
    }
    function drawBst(s) {
        const m = s.mark;
        const cls = k => k === m.add || k === m.found ? (m.found != null ? 'cur' : 'new')
            : k === m.dup ? 'dup' : k === m.succ ? 'succ' : k === m.gone ? 'gone' : s.path.includes(k) ? 'path' : '';
        const onPath = (a, b) => s.path.includes(a) && s.path.includes(b);
        // Rows that point at a node get a number; the same number appears as a badge on that node.
        const order = {};
        let n = 0;
        const STAG = 0.35;
        const items = s.rows.map((r, i) => {
            const num = r.node != null ? ++n : null;
            if (num) order[r.node] = num;
            const lead = num ? `<span class="cmp-n">${num}</span>` : `<span class="cmp-n icon ${r.go}"><i class="fa-solid ${r.go === 'dup' ? 'fa-xmark' : r.go === 'info' ? 'fa-info' : 'fa-check'}"></i></span>`;
            const go = num && GO[r.go] ? `<span class="cmp-go ${r.go}">${GO[r.go]}</span>` : '';
            return `<li class="cmp-row ${num ? '' : 'note'} ${r.go}" style="animation-delay:${i * STAG}s">${lead}
                <span class="cmp-what">${r.html}${r.why ? `<span class="cmp-why">${r.why}</span>` : ''}</span>${go}</li>`;
        }).join('');
        return lane('Insert order', chips(s.keys, (x, i) => i === s.done && s.done < s.keys.length ? 'cur' : i > s.done ? 'dim' : '')) +
            `<div class="bst-layout">
                <div class="bst-tree">${drawTree(s.tree, cls, { pathEdge: onPath, order, stagger: STAG })}</div>
                <ol class="cmp-list">${items}</ol>
            </div>` +
            `<div class="legend">
                <span><i class="sw" style="border-color:var(--accent-green);background:var(--accent-green)"></i>new node</span>
                <span><i class="sw" style="border-color:var(--part);background:var(--part-bg)"></i>path compared</span>
                <span><i class="sw" style="border-color:var(--accent-red);background:var(--accent-red)"></i>duplicate</span>
                <span><i class="sw" style="border-color:var(--accent-purple);background:var(--accent-purple)"></i>successor</span>
                <span><b class="cmp-n" style="width:16px;height:16px;font-size:10px">1</b>numbers match the list</span>
            </div>`;
    }
    // Only the search or the delete-root part of bstSteps, starting from the finished tree.
    function bstPhase(keys, opts) {
        const all = bstSteps(keys, opts);
        const tree = all[keys.length - 1].tree;
        const start = {
            tree, path: [], mark: {}, keys, done: keys.length,
            rows: [{ go: 'info', html: `Start from the finished tree. The root is <b>${tree.k}</b>.` }],
            caption: opts.search != null ? `Search <b>${opts.search}</b>: start at the root` : `Delete the root <b>${tree.k}</b>`
        };
        return [start, ...all.slice(keys.length)];
    }
    function bstFinal(keys) {
        const steps = bstSteps(keys);
        return steps[steps.length - 1].tree;
    }

    // "Draw the BST" in the page: click the empty spot where each key goes, or skip a duplicate.
    // A spot is named "<parent key>|l" / "<parent key>|r", or "root" while the tree is empty.
    function bstBuild(root, keys) {
        let tree, i, wrong, last, msg, msgCls;
        const restart = () => { tree = null; i = 0; wrong = 0; last = null; msg = ''; msgCls = ''; };
        const spotFor = (key) => {
            if (!tree) return 'root';
            for (let cur = tree; ;) {
                const c = cmp(key, cur.k);
                if (c === 0) return 'dup';
                const side = c < 0 ? 'l' : 'r';
                if (!cur[side]) return `${cur.k}|${side}`;
                cur = cur[side];
            }
        };
        const find = (n, k) => !n ? null : String(n.k) === k ? n : find(n.l, k) || find(n.r, k);
        const place = (spot, key) => {
            if (spot === 'root') { tree = { k: key }; return; }
            const [pk, side] = spot.split('|');
            find(tree, pk)[side] = { k: key };
        };
        const withSpots = (n) => ({ k: n.k,
            l: n.l ? withSpots(n.l) : { k: '', slot: `${n.k}|l` },
            r: n.r ? withSpots(n.r) : { k: '', slot: `${n.k}|r` } });
        const finish = () => {
            if (i < keys.length) return;
            msg = wrong ? `Tree complete, with ${wrong} wrong move${wrong > 1 ? 's' : ''}. Compare it with the answer.` : 'Tree complete, no mistakes!';
            msgCls = wrong ? 'bad' : 'ok';
        };
        const render = () => {
            const done = i >= keys.length;
            const shown = done ? tree : tree ? withSpots(tree) : { k: '', slot: 'root' };
            root.innerHTML = `<div class="quiz-wrap">
                <div class="tip"><i class="fa-solid fa-hand-pointer"></i><div>Click the dashed <b>+</b> spot where the next key goes. Start at the root every time. If the key is already in the tree, press <b>Skip duplicate</b>.</div></div>
                ${lane('Insert order', chips(keys, (x, j) => j === i ? 'cur' : j > i ? 'dim' : ''))}
                <div class="click-viz build-viz">${drawTree(shown, k => k === last ? 'new' : '', { dx: 50 })}</div>
                <div class="quiz-row">
                    ${done ? '' : `<span class="next-key">Next key <span class="chip cur">${keys[i]}</span></span>`}
                    <button type="button" class="btn btn-secondary" data-q="skip" ${done ? 'disabled' : ''}><i class="fa-solid fa-forward"></i><span>Skip duplicate</span></button>
                    <button type="button" class="btn btn-secondary" data-q="restart"><i class="fa-solid fa-rotate-left"></i><span>Start again</span></button>
                    <span class="quiz-msg ${msgCls}">${msg}</span>
                </div></div>`;
        };
        root.addEventListener('click', (e) => {
            const q = e.target.closest('[data-q]');
            const slot = e.target.closest('.node.slot');
            if (q && q.dataset.q === 'restart') restart();
            else if (i >= keys.length) return;
            else if (q || slot) {
                const key = keys[i], want = spotFor(key);
                const pick = q ? 'dup' : slot.dataset.slot;
                if (pick === want) {
                    if (want === 'dup') { msg = `${key} is already in the tree → ignored.`; last = null; }
                    else { place(want, key); last = key; msg = `${key} placed.`; }
                    msgCls = 'ok';
                    i++;
                    finish();
                } else {
                    wrong++;
                    msg = want === 'dup' ? `${key} is already in the tree. Do not insert it.`
                        : q ? `${key} is not in the tree yet, so it is not a duplicate.`
                        : `Not there. Compare ${key} again, starting at the root.`;
                    msgCls = 'bad';
                }
            } else return;
            render();
        });
        restart();
        render();
    }

    /* ═════════════ Part C: traversals ═════════════ */
    const TNAME = { pre: 'Pre-order', in: 'In-order', post: 'Post-order' };
    const TRULE = { pre: 'Root → Left → Right', in: 'Left → Root → Right', post: 'Left → Right → Root' };
    function travOrder(root, type) {
        const out = [];
        (function w(n) {
            if (!n) return;
            if (type === 'pre') out.push(n);
            w(n.l);
            if (type === 'in') out.push(n);
            w(n.r);
            if (type === 'post') out.push(n);
        })(root);
        return out;
    }
    function travReason(n, type) {
        if (type === 'pre') {
            const next = [n.l && `left child ${n.l.k}`, n.r && `right child ${n.r.k}`].filter(Boolean);
            return `Arrive at <b>${n.k}</b> → write it <b>right away</b>${next.length ? `, then visit its ${next.join(', then ')}` : ' (leaf)'}.`;
        }
        if (type === 'in') {
            return `<b>${n.k}</b>: ${n.l ? `its left side (under ${n.l.k}) is done` : 'it has <b>no left child</b>'} → write it${n.r ? `, then go right to ${n.r.k}` : ''}.`;
        }
        return `<b>${n.k}</b>: ${n.l || n.r ? 'everything below it is done' : 'it is a leaf'} → write it now.`;
    }
    // `only` = a single order ('pre' | 'in' | 'post'): no tab row, just that walk-through.
    function travSteps(tree, type) {
        const seq = travOrder(tree, type);
        const steps = [{ seq, n: 0, caption: `<b>${TNAME[type]}</b> = ${TRULE[type]}. Start at the root ${tree.k}.` }];
        seq.forEach((node, i) => steps.push({ seq, n: i + 1, caption: travReason(node, type) }));
        steps[steps.length - 1].caption += ` Done: <b>${seq.map(x => x.k).join(', ')}</b>.`;
        return steps;
    }
    function travWalk(root, tree, only) {
        if (only) root.innerHTML = '<div class="trav-player"></div>';
        const tabs = $('.tabs', root), player = $('.trav-player', root);
        const run = (type) => {
            if (tabs) $$('.tab', tabs).forEach(t => t.classList.toggle('active', t.dataset.t === type));
            const steps = travSteps(tree, type);
            stepper(player, steps, (s) => {
                const visited = s.seq.slice(0, s.n).map(x => x.k);
                const order = {};
                visited.forEach((k, i) => { order[k] = i + 1; });
                const cur = s.n ? s.seq[s.n - 1].k : null;
                return drawTree(tree, k => k === cur ? 'cur' : visited.includes(k) ? 'done' : '', { lr: true, order, dx: 66 }) +
                    boxes(s.seq.length, visited);
            });
        };
        if (tabs) {
            tabs.innerHTML = ['pre', 'in', 'post'].map(t => `<button type="button" class="tab" data-t="${t}">${TNAME[t]}</button>`).join('');
            tabs.onclick = (e) => { const t = e.target.closest('.tab'); if (t) run(t.dataset.t); };
        }
        run(only || 'pre');
    }
    const seqAnswer = (label, arr) =>
        `<div class="answer-line"><span class="lbl">${label}</span><span class="ans mono">${arr.join(', ')}</span></div>`;

    /* ═════════════ Click-to-answer quiz (trees & graphs) ═════════════ */
    function clickQuiz(root, cfg) {
        const keys = Object.keys(cfg.tabs);
        const hasTime = cfg.time != null;
        let tab = keys[0], picks = [], checked = false, msg = '', msgCls = '', timeVal = '', timeOk = false;
        let walk = null;   // projector: { steps, i } while the answer is walked through on this same widget
        // One live region that is never re-created, so screen readers announce "3 / 9 correct" etc.
        const live = document.createElement('div');
        live.className = 'sr-only'; live.setAttribute('role', 'status');
        root.after(live);
        const render = () => {
            // Every click re-renders the widget: remember what had focus so keyboard users keep their place
            const active = document.activeElement;
            let focusId = null;
            if (active && root.contains(active)) {
                const g = active.closest('.node[data-k]');
                focusId = g ? 'k:' + g.dataset.k : active.dataset.q ? 'q:' + active.dataset.q : active.dataset.tab ? 't:' + active.dataset.tab : null;
            }
            const ans = cfg.tabs[tab].answer;
            const n = cfg.slots || ans.length;
            // Walk mode swaps in the current step's picture, boxes and caption; the layout stays the same
            const w = walk && walk.steps[walk.i], lastStep = w && walk.i === walk.steps.length - 1;
            const shownPicks = w ? w.picks : picks;
            const order = {};
            shownPicks.forEach((k, i) => { order[k] = i + 1; });
            root.innerHTML = `<div class="quiz-wrap">
                ${keys.length > 1 ? `<div class="tabs">${keys.map(k => `<button type="button" class="tab ${k === tab ? 'active' : ''}" data-tab="${k}">${cfg.tabs[k].label}</button>`).join('')}</div>` : ''}
                ${w ? stepTip(walk.i, walk.steps.length, w.caption) : `<div class="tip"><i class="fa-solid fa-hand-pointer"></i><div>${cfg.tabs[tab].prompt}</div></div>`}
                <div class="click-viz">${w ? cfg.draw(w.cls, order, w.ecls) : cfg.draw(k => picks.includes(k) ? 'done' : '', order)}</div>
                ${w ? boxes(n, w.picks, () => lastStep ? 'ok' : 'filled') + (w.panel || '') : boxes(n, picks, i => checked ? (picks[i] === ans[i] ? 'ok' : 'bad') : 'filled')}
                ${hasTime ? `<label class="time-field ${w ? (w.time != null ? 'ok' : '') : checked ? (timeOk ? 'ok' : 'bad') : ''}"><span>Total travel time (min)</span><input type="number" min="0" inputmode="numeric" data-time ${w ? 'readonly' : ''} value="${w ? (w.time ?? '') : timeVal}"></label>` : ''}
                ${w ? walkRow(walk.i, walk.steps.length) : ''}
                <div class="quiz-row" ${w ? 'hidden' : ''}>
                    <button type="button" class="btn btn-secondary" data-q="undo"><i class="fa-solid fa-delete-left"></i><span>Undo</span></button>
                    <button type="button" class="btn btn-secondary" data-q="clear"><i class="fa-solid fa-eraser"></i><span>Clear</span></button>
                    <button type="button" class="btn btn-part" data-q="check"><i class="fa-solid fa-check"></i><span>Check my answer</span></button>
                    <span class="quiz-msg ${msgCls}">${msg}</span>
                </div></div>`;
            // Tree / map nodes behave as buttons: reachable with Tab, Enter or Space picks them
            $$('.click-viz .node[data-k]', root).forEach(g => {
                const k = g.dataset.k, at = picks.indexOf(k);
                g.setAttribute('tabindex', '0');
                g.setAttribute('role', 'button');
                g.setAttribute('aria-pressed', String(at >= 0));
                g.setAttribute('aria-label', at >= 0 ? `${k}, picked as number ${at + 1}` : k);
            });
            $$('.boxes .box', root).forEach((b, i) => { if (picks[i] != null) b.title = 'Click to remove this one and the ones after it'; });
            live.textContent = msg;
            if (focusId) {
                const c = focusId.indexOf(':'), kind = focusId.slice(0, c), id = focusId.slice(c + 1);
                const el = $(kind === 'k' ? `.node[data-k="${id}"]` : kind === 'q' ? `[data-q="${id}"]` : `[data-tab="${id}"]`, root);
                if (el) el.focus({ preventScroll: true });
            }
        };
        // Enter picks a focused node (like a button); Space picks on release
        const press = (e) => e.target.closest('.node[data-k]');
        root.addEventListener('keydown', (e) => {
            const g = press(e);
            if (!g) return;
            if (e.key === 'Enter') { e.preventDefault(); g.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
            else if (e.key === ' ') e.preventDefault();
        });
        root.addEventListener('keyup', (e) => {
            const g = press(e);
            if (g && e.key === ' ') g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        // Typing in the time box must not re-render (it would drop focus): just clear the old marks.
        root.addEventListener('input', (e) => {
            if (!e.target.matches('[data-time]')) return;
            timeVal = e.target.value;
            if (!checked) return;
            checked = false; msg = ''; msgCls = '';
            $$('.box.ok, .box.bad', root).forEach(b => { b.classList.remove('ok', 'bad'); b.classList.add('filled'); });
            e.target.closest('.time-field').className = 'time-field';
            const m = $('.quiz-msg', root);
            m.textContent = ''; m.className = 'quiz-msg';
        });
        root.addEventListener('click', (e) => {
            if (walk) {   // walking through the answer: only the step buttons do anything
                const b = e.target.closest('[data-w]');
                if (!b) return;
                const last = walk.steps.length - 1;
                walk.i = b.dataset.w === 'next' ? Math.min(walk.i + 1, last) : b.dataset.w === 'prev' ? Math.max(walk.i - 1, 0) : last;
                render();
                return;
            }
            const ans = cfg.tabs[tab].answer;
            const n = cfg.slots || ans.length;
            const t = e.target.closest('[data-tab]');
            const q = e.target.closest('[data-q]');
            const node = e.target.closest('.node[data-k]');
            const box = e.target.closest('.boxes .box[data-i]');
            if (t) { tab = t.dataset.tab; picks = []; checked = false; msg = ''; }
            else if (q) {
                const a = q.dataset.q;
                checked = false; msg = ''; msgCls = '';
                if (a === 'undo') picks.pop();
                else if (a === 'clear') { picks = []; timeVal = ''; }
                else if (cfg.slots ? picks.length < 2 : picks.length < n) {
                    msg = cfg.slots ? 'Click at least 2 stations first.' : `Fill all ${n} boxes first (${picks.length} so far).`; msgCls = 'bad';
                } else {
                    checked = true;
                    timeOk = hasTime && timeVal !== '' && Number(timeVal) === cfg.time;
                    const total = ans.length + (hasTime ? 1 : 0);
                    const got = ans.filter((k, i) => picks[i] === k).length + (timeOk ? 1 : 0);
                    if (got === total && picks.length === ans.length) { msg = 'All correct!'; msgCls = 'ok'; }
                    else { msg = `${got} / ${total} correct. Red items are wrong.`; msgCls = 'bad'; }
                }
            } else if (node) {
                const k = node.dataset.k;
                checked = false; msg = ''; msgCls = '';
                if (picks.includes(k)) { msg = `${k} is already in a box. Each node appears once.`; msgCls = 'bad'; }
                else if (picks.length < n) picks.push(k);
            } else if (box && picks[+box.dataset.i - 1] != null) {
                // Fix a mistake in the middle: click a filled box to take it and everything after it back
                picks = picks.slice(0, +box.dataset.i - 1);
                checked = false; msg = ''; msgCls = '';
            } else return;
            render();
        });
        // Projector mode: "Show answer" fills the empty boxes in place; hide puts the student's entries back.
        let saved = null;
        root._quiz = {
            // Show answer in the projector: the same picture and boxes, played one step at a time
            walk() {
                const steps = cfg.tabs[tab].walk && cfg.tabs[tab].walk();
                if (!steps) return root._quiz.reveal();
                if (!saved) saved = { picks: [...picks], timeVal };
                walk = { steps, i: 0 };
                render();
            },
            reveal() {
                if (!saved) saved = { picks: [...picks], timeVal };
                picks = [...cfg.tabs[tab].answer];
                if (hasTime) timeVal = String(cfg.time);
                checked = true; timeOk = hasTime; msg = 'Answer shown'; msgCls = 'ok';
                render();
            },
            hide() {
                walk = null;
                if (!saved) return;
                ({ picks, timeVal } = saved); saved = null;
                checked = false; msg = ''; msgCls = '';
                render();
            }
        };
        render();
    }

    // Pick-in-order quiz on a row of chips (Part A): same click-into-boxes flow as the tree/graph quizzes.
    const chipQuiz = (pool, answer, prompt) => ({
        tabs: { seq: { label: '', answer: answer.map(String), prompt } },
        draw: (cls, order) => `<div class="lane pick-lane">${pool.map(String).map(k =>
            `<button type="button" class="chip pick node ${cls(k)}" data-k="${k}">${k}${order[k] ? `<span class="pick-n">${order[k]}</span>` : ''}</button>`).join('')}</div>`
    });

    // Short answers: one row per field, either option buttons (options) or a number box. One Check marks them all.
    function fieldQuiz(root, fields) {
        root.innerHTML = `<div class="quiz-wrap">
            ${fields.map((f, i) => `<div class="fq-row" data-i="${i}"><span class="fq-label">${f.label}</span>${f.options
                ? `<div class="fq-opts">${f.options.map(o => `<button type="button" class="fq-opt" data-v="${o}">${o}</button>`).join('')}</div>`
                : `<input class="dq-input" type="number" min="0" inputmode="numeric" aria-label="${f.label}">`}</div>`).join('')}
            <div class="quiz-row">
                <button type="button" class="btn btn-secondary" data-q="clear"><i class="fa-solid fa-eraser"></i><span>Clear</span></button>
                <button type="button" class="btn btn-part" data-q="check"><i class="fa-solid fa-check"></i><span>Check my answer</span></button>
                <span class="quiz-msg"></span>
            </div></div>`;
        const msgEl = $('.quiz-msg', root);
        const setMsg = (text, cls = '') => { msgEl.textContent = text; msgEl.className = 'quiz-msg ' + cls; };
        const rows = () => $$('.fq-row', root);
        const unmark = () => { rows().forEach(r => r.classList.remove('ok', 'bad')); setMsg(''); };
        const value = (row) => { const sel = $('.fq-opt.sel', row), inp = $('input', row); return sel ? sel.dataset.v : inp ? inp.value.trim() : ''; };
        root.addEventListener('input', unmark);
        root.addEventListener('click', (e) => {
            const opt = e.target.closest('.fq-opt');
            if (opt) { $$('.fq-opt', opt.parentNode).forEach(b => b.classList.toggle('sel', b === opt)); unmark(); return; }
            const q = e.target.closest('[data-q]');
            if (!q) return;
            unmark();
            if (q.dataset.q === 'clear') { $$('.fq-opt.sel', root).forEach(b => b.classList.remove('sel')); $$('input', root).forEach(x => { x.value = ''; }); return; }
            if (rows().some(r => value(r) === '')) { setMsg('Answer every part first.', 'bad'); return; }
            let right = 0;
            rows().forEach(r => {
                const ok = value(r) === String(fields[r.dataset.i].answer);
                if (ok) right++;
                r.classList.add(ok ? 'ok' : 'bad');
            });
            right === fields.length ? setMsg(fields.length > 1 ? 'All correct!' : 'Correct!', 'ok')
                : setMsg(fields.length > 1 ? `${right} / ${fields.length} correct. Red parts are wrong.` : 'Not quite. Try again.', 'bad');
        });
    }

    // Fill-in Dijkstra table: Fastest time / Previous / Order finalised, one row per station.
    function dijkstraQuiz(root, G, src) {
        const s = dijkstraSteps(G, src).pop();
        const names = [src, ...s.names.filter(n => n !== src)];
        const prevOpts = ['', '–', ...s.names].map(v => `<option value="${v}">${v || '…'}</option>`).join('');
        const rows = names.map(n => n === src
            ? `<tr class="given"><td><b>${n}</b></td><td class="c">0</td><td class="c">–</td><td class="c">1</td></tr>`
            : `<tr data-n="${n}"><td><b>${n}</b></td>
                <td class="c"><input class="dq-input" type="number" min="0" inputmode="numeric" data-f="t" aria-label="Fastest time to ${n}"></td>
                <td class="c"><select class="dq-input" data-f="p" aria-label="Previous station of ${n}">${prevOpts}</select></td>
                <td class="c"><input class="dq-input" type="number" min="1" inputmode="numeric" data-f="o" aria-label="Order ${n} is finalised"></td></tr>`).join('');
        root.innerHTML = `<div class="two-col">
            <div class="dq-graph-col">
                <div class="dq-graph">${drawGraph(G)}</div>
                <div class="dq-walk-tip" hidden></div>
                <div class="dq-walk-row" hidden></div>
            </div>
            <div class="quiz-wrap">
                <div class="table-wrap"><table class="g-table dq-table"><tr><th>Station</th><th class="c">Fastest time (min)</th><th class="c">Previous</th><th class="c">Order finalised</th></tr>${rows}</table></div>
                <div class="quiz-row">
                    <button type="button" class="btn btn-secondary" data-q="clear"><i class="fa-solid fa-eraser"></i><span>Clear</span></button>
                    <button type="button" class="btn btn-part" data-q="check"><i class="fa-solid fa-check"></i><span>Check my answer</span></button>
                    <span class="quiz-msg" role="status" aria-live="polite"></span>
                </div></div></div>`;
        const msgEl = $('.quiz-msg', root);
        const setMsg = (text, cls = '') => { msgEl.textContent = text; msgEl.className = 'quiz-msg ' + cls; };
        const fields = () => $$('tr[data-n] .dq-input', root);
        const reset = (el) => el.classList.remove('ok', 'bad');
        root.addEventListener('input', (e) => { if (e.target.matches('.dq-input')) { reset(e.target); setMsg(''); } });
        root.addEventListener('click', (e) => {
            const q = e.target.closest('[data-q]');
            if (!q) return;
            if (q.dataset.q === 'clear') { fields().forEach(el => { el.value = ''; reset(el); }); setMsg(''); return; }
            let right = 0, total = 0;
            $$('tr[data-n]', root).forEach(tr => {
                const n = tr.dataset.n;
                const want = { t: String(s.dist[n]), p: s.prev[n] || '–', o: String(s.order[n]) };
                $$('.dq-input', tr).forEach(el => {
                    total++;
                    const ok = el.value.trim() === want[el.dataset.f];
                    if (ok) right++;
                    el.classList.toggle('ok', ok); el.classList.toggle('bad', !ok);
                });
            });
            right === total ? setMsg('All correct!', 'ok') : setMsg(`${right} / ${total} correct. Red cells are wrong.`, 'bad');
        });
        // Projector mode: fill every cell with the answer, then put the student's entries back on hide.
        let saved = null, walkAt = null;
        // Walk mode: the table and the map are played one step at a time (same layout, step buttons instead of Check)
        const walkSteps = dijkstraSteps(G, src);
        const paint = () => {
            const s = walkSteps[walkAt], tr = $$('tr[data-n]', root);
            $('.dq-walk-tip', root).innerHTML = stepTip(walkAt, walkSteps.length, s.caption);
            tr.forEach(row => {
                const n = row.dataset.n, [t, p, o] = $$('.dq-input', row);
                t.value = s.dist[n] === Infinity ? '∞' : s.dist[n];
                p.value = s.prev[n] || '–';
                o.value = s.order[n] || '';
                row.classList.toggle('hl', n === s.cur);
                const cells = $$('td', row);
                cells[1].className = 'c ' + (s.changed.includes(n) ? 'changed' : s.kept.includes(n) ? 'kept' : '');
                cells[2].className = 'c ' + (s.changed.includes(n) ? 'changed' : '');
            });
            const treeEdges = s.names.filter(n => s.prev[n]).map(n => ekey(n, s.prev[n]));
            $('.dq-graph', root).innerHTML = drawGraph(G, { cls: k => k === s.cur ? 'cur' : s.order[k] ? 'done' : s.dist[k] < Infinity ? 'seen' : '',
                ecls: k => treeEdges.includes(k) ? 'on' : '', dist: s.dist, cut: G.cut });
            $('.dq-walk-row', root).innerHTML = walkRow(walkAt, walkSteps.length);
        };
        root.addEventListener('click', (e) => {
            const b = e.target.closest('[data-w]');
            if (!b || walkAt == null) return;
            const last = walkSteps.length - 1;
            walkAt = b.dataset.w === 'next' ? Math.min(walkAt + 1, last) : b.dataset.w === 'prev' ? Math.max(walkAt - 1, 0) : last;
            paint();
        });
        root._quiz = {
            walk() {
                if (!saved) saved = fields().map(el => el.value);
                walkAt = 0;
                $$('tr[data-n] .dq-input', root).forEach(el => { el.readOnly = true; el.classList.remove('ok', 'bad'); if (el.type === 'number') el.type = 'text'; });
                $('.quiz-row', root).hidden = true;
                $('.dq-walk-tip', root).hidden = false;
                $('.dq-walk-row', root).hidden = false;
                paint();
            },
            reveal() {
                if (!saved) saved = fields().map(el => el.value);
                $$('tr[data-n]', root).forEach(tr => {
                    const n = tr.dataset.n;
                    const want = { t: String(s.dist[n]), p: s.prev[n] || '–', o: String(s.order[n]) };
                    $$('.dq-input', tr).forEach(el => { el.value = want[el.dataset.f]; el.classList.remove('bad'); el.classList.add('ok'); });
                });
                setMsg('Answer shown', 'ok');
            },
            hide() {
                if (walkAt != null) {
                    walkAt = null;
                    $$('tr[data-n]', root).forEach(row => {
                        row.classList.remove('hl');
                        $$('td', row).forEach(c => { c.className = c.cellIndex ? 'c' : ''; });
                        const [t, , o] = $$('.dq-input', row);
                        t.type = 'number'; o.type = 'number';
                    });
                    $$('.dq-input', root).forEach(el => { el.readOnly = false; });
                    $('.dq-graph', root).innerHTML = drawGraph(G);
                    $('.quiz-row', root).hidden = false;
                    $('.dq-walk-tip', root).hidden = true;
                    $('.dq-walk-row', root).hidden = true;
                }
                if (!saved) return;
                fields().forEach((el, i) => { el.value = saved[i]; reset(el); });
                saved = null; setMsg('');
            }
        };
    }

    // Fastest route quiz: click stations into one box per station on the map, then type the total time.
    function routeQuiz(G, from, to, cut) {
        const g = cut ? { ...G, cut } : G;
        const s = dijkstraSteps(g, from).pop();
        const route = [];
        for (let n = to; n; n = s.prev[n]) route.unshift(n);
        return {
            slots: Object.keys(G.nodes).length, time: s.dist[to],
            tabs: { route: { label: 'Route', answer: route,
                prompt: `Click the stations of the fastest route from <b>${from}</b> to <b>${to}</b>, in order. Leave unused boxes empty, then type the total time.`,
                // One station per step, then the total time: the route read forward from the Previous column
                walk: () => [0, ...route.map((_, k) => k + 1)].map(k => {
                    const picks = route.slice(0, k), v = route[k - 1], last = k === route.length;
                    const edges = picks.slice(1).map((x, j) => ekey(picks[j], x));
                    return {
                        picks, cls: x => picks.includes(x) ? 'path' : '', ecls: x => edges.includes(x) ? 'path' : '',
                        caption: k === 0 ? `Follow <b>Previous</b> back from <b>${to}</b> to <b>${from}</b>, then read the route forward from <b>${from}</b>.`
                            : `${k === 1 ? 'Start at' : 'Next:'} <b>${v}</b> (${s.dist[v]} min in total).` + (last ? ` The route ends here: <b>${s.dist[to]} min</b>.` : ''),
                        time: last ? s.dist[to] : null
                    };
                }) } },
            draw: (cls, order, ecls) => drawGraph(g, { cls, order, cut, ecls })
        };
    }

    /* ═════════════ Part D: graphs ═════════════ */
    const ekey = (u, v) => [u, v].sort().join('-');
    function adjOf(G) {
        const a = {};
        Object.keys(G.nodes).sort().forEach(k => { a[k] = []; });
        G.edges.forEach(([u, v, w]) => {
            if (G.cut && ekey(u, v) === G.cut) return;
            a[u].push([v, w]); a[v].push([u, w]);
        });
        Object.values(a).forEach(l => l.sort((p, q) => p[0] < q[0] ? -1 : 1));
        return a;
    }
    function drawGraph(G, o = {}) {
        const cls = o.cls || (() => ''), ecls = o.ecls || (() => '');
        let s = '';
        G.edges.forEach(([u, v, w]) => {
            const [x1, y1] = G.nodes[u], [x2, y2] = G.nodes[v];
            const k = ekey(u, v);
            const c = o.cut === k ? 'cut' : ecls(k);
            s += `<line class="edge ${c}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
            s += `<rect class="wbox" x="${mx - 13}" y="${my - 10}" width="26" height="20" rx="6"/><text class="wtxt" x="${mx}" y="${my}">${w}</text>`;
            if (o.cut === k) s += `<text class="ghost" x="${mx}" y="${my - 18}">closed</text>`;
        });
        Object.entries(G.nodes).forEach(([k, [x, y]]) => {
            const ord = o.order && o.order[k] ? `<g class="ord-g"><circle class="ord-bg" cx="${x + 18}" cy="${y - 18}" r="9"/><text class="ord" x="${x + 18}" y="${y - 18}">${o.order[k]}</text></g>` : '';
            const dist = o.dist ? `<text class="dist" x="${x}" y="${y - 30}">${o.dist[k] === Infinity ? '∞' : o.dist[k]}</text>` : '';
            s += `<g class="node ${cls(k)}" data-k="${k}"><circle cx="${x}" cy="${y}" r="22"/><text x="${x}" y="${y}">${k}</text>${ord}${dist}</g>`;
        });
        return `<svg class="viz" viewBox="0 0 ${G.w} ${G.h}" style="max-width:${G.w * 1.15}px">${s}</svg>`;
    }
    function adjTable(G) {
        const a = adjOf(G);
        return `<div class="table-wrap"><table class="g-table"><tr><th>Station</th><th>Neighbours (A → Z, with weight)</th></tr>${
            Object.entries(a).map(([k, l]) => `<tr><td><b>${k}</b></td><td class="mono">${l.map(([v, w]) => `${v} ${w}`).join(', ')}</td></tr>`).join('')}</table></div>`;
    }

    function dfsSteps(G, start) {
        const adj = adjOf(G), total = Object.keys(G.nodes).length;
        const visited = [start], stack = [start], tree = [];
        const snap = (cur, caption) => ({ cur, visited: [...visited], stack: [...stack], tree: [...tree], caption, total });
        const steps = [snap(start, `Start at <b>${start}</b>. Write it in box 1.`)];
        while (stack.length) {
            const cur = stack[stack.length - 1];
            const unv = adj[cur].map(x => x[0]).filter(v => !visited.includes(v));
            if (unv.length) {
                const nx = unv[0];
                visited.push(nx); stack.push(nx); tree.push(ekey(cur, nx));
                steps.push(snap(nx, `At <b>${cur}</b>: unvisited neighbours ${unv.join(', ')} → go to <b>${nx}</b> (first A → Z).`));
                if (visited.length === total) {
                    steps.push(snap(null, `Every station is visited → <b>DFS done: ${visited.join(', ')}</b>.`));
                    break;
                }
            } else {
                const back = [cur];
                stack.pop();
                while (stack.length) {
                    const t = stack[stack.length - 1];
                    back.push(t);
                    if (adj[t].some(([v]) => !visited.includes(v))) break;
                    stack.pop();
                }
                steps.push(snap(stack[stack.length - 1], `At <b>${cur}</b>: no unvisited neighbours → <b>backtrack</b> ${back.join(' → ')}.`));
            }
        }
        return steps;
    }
    const drawDfs = (G) => (s) => `<div class="two-col">
        <div>${drawGraph(G, { cls: k => k === s.cur ? 'cur' : s.visited.includes(k) ? 'done' : '', ecls: k => s.tree.includes(k) ? 'on' : '' })}</div>
        <div style="display:flex;flex-direction:column;gap:12px">
            <div class="panel"><div class="panel-h">Visit order (your answer)</div>${boxes(s.total, s.visited)}</div>
            <div class="panel"><div class="panel-h">Stack = the way back</div>
                <div class="lane"><span class="lane-end">bottom</span>${chips(s.stack, (x, i) => i === s.stack.length - 1 ? 'cur' : '')}<span class="lane-end">top</span></div></div>
        </div></div>`;

    function bfsSteps(G, start) {
        const adj = adjOf(G), total = Object.keys(G.nodes).length;
        const seen = [start], queue = [start], order = [], tree = [];
        const steps = [{ cur: null, queue: [...queue], order: [], seen: [...seen], tree: [], total, caption: `Enqueue <b>${start}</b> and mark it seen.` }];
        while (queue.length) {
            const cur = queue.shift();
            order.push(cur);
            const nb = adj[cur].map(x => x[0]);
            const fresh = nb.filter(v => !seen.includes(v)), old = nb.filter(v => seen.includes(v));
            fresh.forEach(v => { seen.push(v); queue.push(v); tree.push(ekey(cur, v)); });
            const caption = `Dequeue <b>${cur}</b> → write it. ` +
                (fresh.length ? `Enqueue new neighbours <b>${fresh.join(', ')}</b>` : 'No new neighbours') +
                (old.length ? ` <span class="why">(${old.join(', ')} already seen)</span>` : '') + '.';
            steps.push({ cur, queue: [...queue], order: [...order], seen: [...seen], fresh, tree: [...tree], total, caption });
        }
        steps[steps.length - 1].caption += ` Queue empty → <b>BFS done: ${order.join(', ')}</b>.`;
        return steps;
    }
    const drawBfs = (G) => (s) => `<div class="two-col">
        <div>${drawGraph(G, { cls: k => k === s.cur ? 'cur' : s.order.includes(k) ? 'done' : s.seen.includes(k) ? 'seen' : '', ecls: k => s.tree.includes(k) ? 'on' : '' })}</div>
        <div style="display:flex;flex-direction:column;gap:12px">
            <div class="panel"><div class="panel-h">Visit order (your answer)</div>${boxes(s.total, s.order)}</div>
            <div class="panel"><div class="panel-h">Queue</div>
                <div class="lane"><span class="lane-end">front</span>${s.queue.length ? chips(s.queue, x => (s.fresh || []).includes(x) ? 'new' : '') : '<span class="lane-end">(empty)</span>'}<span class="lane-end">rear</span></div></div>
            <div class="legend"><span><i class="sw" style="border-color:var(--accent-blue);background:var(--accent-blue)"></i>dequeued now</span>
                <span><i class="sw" style="border-color:var(--accent-orange);background:var(--bg-orange-light)"></i>seen, waiting in queue</span>
                <span><i class="sw" style="border-color:var(--accent-green);background:var(--accent-green)"></i>written</span></div>
        </div></div>`;

    function dijkstraSteps(G, src) {
        const adj = adjOf(G), names = Object.keys(adj);
        const dist = {}, prev = {}, order = {};
        names.forEach(n => { dist[n] = Infinity; prev[n] = null; });
        dist[src] = 0;
        const snap = (cur, changed, kept, caption) => ({ cur, dist: { ...dist }, prev: { ...prev }, order: { ...order }, changed, kept, names, caption });
        const steps = [snap(null, [], [], `Set <b>${src} = 0</b> and every other station = ∞.`)];
        let k = 1;
        for (;;) {
            const open = names.filter(n => !order[n] && dist[n] < Infinity);
            if (!open.length) break;
            const best = Math.min(...open.map(n => dist[n]));
            const ties = open.filter(n => dist[n] === best);
            const cur = ties[0];
            order[cur] = k++;
            const notes = [], changed = [], kept = [];
            adj[cur].forEach(([v, w]) => {
                if (order[v]) return;
                const nd = dist[cur] + w;
                if (nd < dist[v]) {
                    notes.push(`${v}: ${dist[cur]} + ${w} = <b>${nd}</b> &lt; ${dist[v] === Infinity ? '∞' : dist[v]} → <b>update</b>`);
                    dist[v] = nd; prev[v] = cur; changed.push(v);
                } else {
                    notes.push(`${v}: ${dist[cur]} + ${w} = ${nd} ${nd === dist[v] ? '=' : '&gt;'} ${dist[v]} → not strictly smaller, <b>keep</b> (Previous stays ${prev[v]})`);
                    kept.push(v);
                }
            });
            const pick = `Pick <b>${cur}</b> (smallest: ${best})` + (ties.length > 1 ? ` <span class="why">tie with ${ties.slice(1).join(', ')} → alphabetical</span>` : '') + '.';
            steps.push(snap(cur, changed, kept, pick + '<br>' + (notes.length ? notes.join('<br>') : 'No unfinished neighbours to update.')));
        }
        steps[steps.length - 1].caption += '<br>All stations are finished.';
        return steps;
    }
    const drawDijkstra = (G) => (s) => {
        const treeEdges = s.names.filter(n => s.prev[n]).map(n => ekey(n, s.prev[n]));
        const rows = s.names.map(n => `<tr class="${n === s.cur ? 'hl' : s.order[n] ? 'done' : ''}">
            <td><b>${n}</b></td>
            <td class="c ${s.changed.includes(n) ? 'changed' : s.kept.includes(n) ? 'kept' : ''}">${s.dist[n] === Infinity ? '∞' : s.dist[n]}</td>
            <td class="c ${s.changed.includes(n) ? 'changed' : ''}">${s.prev[n] || '–'}</td>
            <td class="c">${s.order[n] || ''}</td></tr>`).join('');
        return `<div class="two-col">
            <div>${drawGraph(G, { cls: k => k === s.cur ? 'cur' : s.order[k] ? 'done' : s.dist[k] < Infinity ? 'seen' : '', ecls: k => treeEdges.includes(k) ? 'on' : '', dist: s.dist, cut: G.cut })}</div>
            <div><div class="table-wrap"><table class="g-table"><tr><th>Station</th><th class="c">Time</th><th class="c">Previous</th><th class="c">Order</th></tr>${rows}</table></div>
            <div class="legend" style="margin-top:8px"><span><i class="sw" style="border-color:var(--accent-orange);background:var(--bg-orange-light)"></i>updated</span>
                <span><i class="sw" style="border-color:var(--accent-red);background:var(--bg-red-light)"></i>equal / bigger → kept</span>
                <span><i class="sw" style="border-color:var(--accent-green);background:var(--accent-green)"></i>finished</span></div></div>
        </div>`;
    };
    function dijkstraTable(G, src) {
        const steps = dijkstraSteps(G, src), s = steps[steps.length - 1];
        return `<div class="table-wrap"><table class="g-table"><tr><th>Station</th><th class="c">Fastest time</th><th class="c">Previous</th><th class="c">Order finalised</th></tr>${
            s.names.map(n => `<tr><td><b>${n}</b></td><td class="c"><b>${s.dist[n]}</b></td><td class="c">${s.prev[n] || '–'}</td><td class="c">${s.order[n]}</td></tr>`).join('')}</table></div>`;
    }
    function drawRoute(G, route, cut) {
        const ed = route.slice(1).map((v, i) => ekey(route[i], v));
        return drawGraph({ ...G, cut }, { cls: k => route.includes(k) ? 'path' : '', ecls: k => ed.includes(k) ? 'path' : '', cut });
    }

    /* ═════════════ Data from the exam & practice ═════════════ */
    const EXAM_TREE = { k: 'GF',
        l: { k: 'SF1', l: { k: 'QF1', r: { k: 'PI1' } }, r: { k: 'QF2' } },
        r: { k: 'SF2', l: { k: 'QF3', l: { k: 'PI2' }, r: { k: 'PI3' } } } };
    const PRAC_TREE = { k: 'A', l: { k: 'B', r: { k: 'D', l: { k: 'F' } } }, r: { k: 'C', r: { k: 'E' } } };

    const MAP = { w: 560, h: 340,
        nodes: { MO: [90, 62], PH: [330, 62], MA: [200, 175], LA: [62, 268], SI: [455, 175], AS: [330, 290], SA: [505, 300] },
        edges: [['MO', 'PH', 10], ['MO', 'MA', 18], ['PH', 'MA', 6], ['PH', 'SI', 4], ['MA', 'AS', 6], ['MA', 'LA', 12],
            ['SI', 'AS', 7], ['SI', 'SA', 3], ['SA', 'AS', 7]] };
    const PG = { w: 470, h: 320,
        nodes: { A: [60, 160], B: [215, 60], C: [215, 260], D: [400, 60], E: [400, 260] },
        edges: [['A', 'B', 4], ['A', 'C', 1], ['B', 'C', 2], ['B', 'D', 5], ['C', 'D', 8], ['C', 'E', 10], ['D', 'E', 3]] };

    const BST_Q1 = ['Nam', 'Bee', 'Pim', 'Aom', 'Fah', 'Ploy', 'Toon', 'Earth', 'Mint'];
    const BST_Q2 = [72, 45, 88, 30, 59, 45, 95, 52, 66, 80];
    const BST_P1 = [50, 30, 70, 20, 40, 60, 80, 35, 45, 30];
    const BST_P2 = ['Mew', 'Ice', 'Zen', 'Bank', 'Jay', 'Tan', 'Gun', 'Kai'];
    const PEOPLE = ['Ann', 'Ben', 'Cat', 'Dan', 'Eve', 'Fay'];
    const POTATO_PRAC_NAMES = ['A', 'B', 'C', 'D', 'E'];
    const POTATO_EXAM = potatoSteps(PEOPLE, 3).pop();
    const POTATO_PRAC = potatoSteps(POTATO_PRAC_NAMES, 2).pop();
    const STACK_END = stackSteps(['push(1)', 'push(2)', 'pop()', 'push(3)', 'push(4)', 'pop()', 'pop()', 'push(5)']).pop();
    // Answer options for "new root after deleting the root": every key except the root, sorted.
    const rootChoices = keys => [...new Set(keys.slice(1))].sort(cmp);

    // `only` = one order / one search, so each exam question gets its own quiz with no tab row.
    const travQuiz = (tree, only) => ({
        tabs: Object.fromEntries((only ? [only] : ['pre', 'in', 'post']).map(t => [t, {
            label: TNAME[t],
            answer: travOrder(tree, t).map(n => n.k),
            prompt: `Click the nodes in <b>${TNAME[t]}</b> order (${TRULE[t]}). Boxes fill from left to right. Look at the <b>L / R</b> labels on the edges.`,
            walk: () => travSteps(tree, t).map(s => {
                const visited = s.seq.slice(0, s.n).map(x => x.k), cur = s.n ? s.seq[s.n - 1].k : null;
                return { caption: s.caption, picks: visited, cls: k => k === cur ? 'cur' : visited.includes(k) ? 'done' : '' };
            })
        }])),
        draw: (cls, order) => drawTree(tree, cls, { lr: true, order, dx: 66 })
    });
    const graphQuiz = (G, start, only) => {
        const tabs = {
            dfs: { label: `DFS from ${start}`, answer: dfsSteps(G, start).pop().visited,
                prompt: `Click the stations in <b>DFS</b> order from ${start}. Deepest first, A → Z, backtrack at dead ends.`,
                walk: () => dfsSteps(G, start).map(s => ({
                    caption: s.caption, picks: s.visited,
                    cls: k => k === s.cur ? 'cur' : s.visited.includes(k) ? 'done' : '',
                    ecls: k => s.tree.includes(k) ? 'on' : '',
                    panel: `<div class="panel"><div class="panel-h">Stack = the way back</div><div class="lane"><span class="lane-end">bottom</span>${chips(s.stack, (x, i) => i === s.stack.length - 1 ? 'cur' : '')}<span class="lane-end">top</span></div></div>`
                })) },
            bfs: { label: `BFS from ${start}`, answer: bfsSteps(G, start).pop().order,
                prompt: `Click the stations in <b>BFS</b> order from ${start}. Use a queue, neighbours A → Z.`,
                walk: () => bfsSteps(G, start).map(s => ({
                    caption: s.caption, picks: s.order,
                    cls: k => k === s.cur ? 'cur' : s.order.includes(k) ? 'done' : s.seen.includes(k) ? 'seen' : '',
                    ecls: k => s.tree.includes(k) ? 'on' : '',
                    panel: `<div class="panel"><div class="panel-h">Queue</div><div class="lane"><span class="lane-end">front</span>${s.queue.length ? chips(s.queue, x => (s.fresh || []).includes(x) ? 'new' : '') : '<span class="lane-end">(empty)</span>'}<span class="lane-end">rear</span></div></div>`
                })) }
        };
        return { tabs: only ? { [only]: tabs[only] } : tabs, draw: (cls, order, ecls) => drawGraph(G, { cls, order, ecls }) };
    };

    const MOUNTS = {
        'potato-exam': el => potatoWidget(el, PEOPLE, 3),
        'potato-exam-table': el => { el.innerHTML = potatoTable(PEOPLE, 3); },
        'potato-prac': el => potatoWidget(el, ['A', 'B', 'C', 'D', 'E'], 2),
        'stack-prac': el => withHistory(el, stackSteps(['push(1)', 'push(2)', 'pop()', 'push(3)', 'push(4)', 'pop()', 'pop()', 'push(5)']), drawStack),
        'bracket-prac': el => withHistory(el, bracketSteps('{[()]}('), drawBracket),
        'a-exam-first': el => fieldQuiz(el, [{ label: 'Eliminated first', options: PEOPLE, answer: POTATO_EXAM.out[0] }]),
        'a-exam-order': el => clickQuiz(el, chipQuiz(PEOPLE, POTATO_EXAM.out, 'Click the students in the order they are <b>eliminated</b>. Boxes fill from left to right.')),
        'a-exam-win': el => fieldQuiz(el, [{ label: 'Winner', options: PEOPLE, answer: POTATO_EXAM.win }]),
        'a-exam-deq': el => fieldQuiz(el, [{ label: '20 dequeues in total?', options: ['Yes', 'No'], answer: POTATO_EXAM.deq === 20 ? 'Yes' : 'No' }]),
        'a-p1-order': el => clickQuiz(el, chipQuiz(POTATO_PRAC_NAMES, POTATO_PRAC.out, 'Click the players in the order they are <b>eliminated</b>.')),
        'a-p1-nums': el => fieldQuiz(el, [{ label: 'Winner', options: POTATO_PRAC_NAMES, answer: POTATO_PRAC.win },
            { label: 'Total dequeues', answer: POTATO_PRAC.deq }]),
        'a-p2-popped': el => clickQuiz(el, chipQuiz([1, 2, 3, 4, 5], STACK_END.popped, 'Click the values in the order they are <b>popped</b>.')),
        'a-p2-left': el => clickQuiz(el, chipQuiz([1, 2, 3, 4, 5], STACK_END.st, 'Click the values left in the stack, from <b>bottom</b> to <b>top</b>.')),
        'a-p3': el => fieldQuiz(el, [{ label: 'Balanced?', options: ['Yes', 'No'], answer: 'No' }]),

        'bst-q1': el => stepper(el, bstSteps(BST_Q1), drawBst),
        'bst-q2': el => stepper(el, bstSteps(BST_Q2), drawBst),
        'bst-p1': el => stepper(el, bstSteps(BST_P1), drawBst),
        'bst-p2': el => stepper(el, bstSteps(BST_P2), drawBst),
        'bst-q1-search-walk': el => stepper(el, bstPhase(BST_Q1, { search: 'Earth' }), drawBst),
        'bst-q2-search-walk': el => stepper(el, bstPhase(BST_Q2, { search: 66 }), drawBst),
        'bst-p1-search-walk': el => stepper(el, bstPhase(BST_P1, { search: 45 }), drawBst),
        'bst-p2-search-walk': el => stepper(el, bstPhase(BST_P2, { search: 'Kai' }), drawBst),
        'bst-q1-delete-walk': el => stepper(el, bstPhase(BST_Q1, { deleteRoot: true }), drawBst),
        'bst-q2-delete-walk': el => stepper(el, bstPhase(BST_Q2, { deleteRoot: true }), drawBst),
        'bst-p1-delete-walk': el => stepper(el, bstPhase(BST_P1, { deleteRoot: true }), drawBst),
        'bst-p2-delete-walk': el => stepper(el, bstPhase(BST_P2, { deleteRoot: true }), drawBst),
        'bst-q1-final': el => { el.innerHTML = drawTree(bstFinal(BST_Q1)); },
        'bst-q2-final': el => { el.innerHTML = drawTree(bstFinal(BST_Q2)); },
        'bst-p1-final': el => { el.innerHTML = drawTree(bstFinal(BST_P1)); },
        'bst-p2-final': el => { el.innerHTML = drawTree(bstFinal(BST_P2)); },
        'bst-q1-build': el => bstBuild(el, BST_Q1),
        'bst-q2-build': el => bstBuild(el, BST_Q2),
        'bst-p1-build': el => bstBuild(el, BST_P1),
        'bst-p2-build': el => bstBuild(el, BST_P2),
        'bst-q1-parents': el => fieldQuiz(el, [{ label: 'Parent nodes', answer: 5 }]),
        'bst-q1-siblings': el => fieldQuiz(el, [{ label: 'Sibling pairs', answer: 3 }, { label: 'Nodes that have a sibling', answer: 6 }]),
        'bst-q1-search': el => fieldQuiz(el, [{ label: 'Comparisons', answer: 4 }]),
        'bst-q1-delete': el => fieldQuiz(el, [{ label: 'New root', options: rootChoices(BST_Q1), answer: 'Pim' }]),
        'bst-q2-count': el => fieldQuiz(el, [{ label: 'Nodes in the tree', answer: 9 }]),
        'bst-q2-words': el => fieldQuiz(el, [{ label: 'Parent nodes', answer: 4 }, { label: 'Sibling pairs', answer: 4 }]),
        'bst-q2-search': el => fieldQuiz(el, [{ label: 'Comparisons', answer: 4 }]),
        'bst-q2-delete': el => fieldQuiz(el, [{ label: 'New root', options: rootChoices(BST_Q2), answer: 80 }]),
        'bst-p1-words': el => fieldQuiz(el, [{ label: 'Leaves', answer: 5 }, { label: 'Height', answer: 3 }]),
        'bst-p1-search': el => fieldQuiz(el, [{ label: 'Comparisons', answer: 4 }]),
        'bst-p1-del50': el => fieldQuiz(el, [{ label: 'New root', options: rootChoices(BST_P1), answer: 60 }]),
        'bst-p1-del30': el => fieldQuiz(el, [{ label: 'Replaces 30', options: [...new Set(BST_P1)].filter(k => k !== 30).sort(cmp), answer: 35 }]),
        'bst-p2-search': el => fieldQuiz(el, [{ label: 'Comparisons', answer: 4 }]),
        'bst-p2-delete': el => fieldQuiz(el, [{ label: 'New root', options: rootChoices(BST_P2), answer: 'Tan' }]),

        'map-graph': el => { el.innerHTML = drawGraph(MAP); },
        'map-adj': el => { el.innerHTML = adjTable(MAP); },
        'map-dfs-quiz': el => clickQuiz(el, graphQuiz(MAP, 'SI', 'dfs')),
        'map-bfs-quiz': el => clickQuiz(el, graphQuiz(MAP, 'SI', 'bfs')),
        'map-dfs-ans': el => { el.innerHTML = seqAnswer('DFS', dfsSteps(MAP, 'SI').pop().visited); },
        'map-bfs-ans': el => { el.innerHTML = seqAnswer('BFS', bfsSteps(MAP, 'SI').pop().order); },
        'map-dfs': el => stepper(el, dfsSteps(MAP, 'SI'), drawDfs(MAP)),
        'map-bfs': el => stepper(el, bfsSteps(MAP, 'SI'), drawBfs(MAP)),
        'map-dij-quiz': el => dijkstraQuiz(el, MAP, 'LA'),
        'map-dij': el => stepper(el, dijkstraSteps(MAP, 'LA'), drawDijkstra(MAP)),
        'map-dij-table': el => { el.innerHTML = dijkstraTable(MAP, 'LA'); },
        'map-route-quiz': el => clickQuiz(el, routeQuiz(MAP, 'LA', 'MO')),
        'map-route': el => { el.innerHTML = drawRoute(MAP, ['LA', 'MA', 'PH', 'MO']); },
        'map-route-cut-quiz': el => clickQuiz(el, routeQuiz(MAP, 'LA', 'MO', 'MA-PH')),
        'map-route-cut': el => { el.innerHTML = drawRoute(MAP, ['LA', 'MA', 'MO'], 'MA-PH'); },
        'map-dij-cut': el => { const G = { ...MAP, cut: 'MA-PH' }; stepper(el, dijkstraSteps(G, 'LA'), drawDijkstra(G)); },

        'pg-graph': el => { el.innerHTML = drawGraph(PG); },
        'pg-adj': el => { el.innerHTML = adjTable(PG); },
        'pg-dfs-quiz': el => clickQuiz(el, graphQuiz(PG, 'D', 'dfs')),
        'pg-bfs-quiz': el => clickQuiz(el, graphQuiz(PG, 'D', 'bfs')),
        'pg-dfs-ans': el => { el.innerHTML = seqAnswer('DFS', dfsSteps(PG, 'D').pop().visited); },
        'pg-bfs-ans': el => { el.innerHTML = seqAnswer('BFS', bfsSteps(PG, 'D').pop().order); },
        'pg-dfs': el => stepper(el, dfsSteps(PG, 'D'), drawDfs(PG)),
        'pg-bfs': el => stepper(el, bfsSteps(PG, 'D'), drawBfs(PG)),
        'pg-dij-quiz': el => dijkstraQuiz(el, PG, 'A'),
        'pg-dij': el => stepper(el, dijkstraSteps(PG, 'A'), drawDijkstra(PG)),
        'pg-dij-table': el => { el.innerHTML = dijkstraTable(PG, 'A'); },
        'pg-route-quiz': el => clickQuiz(el, routeQuiz(PG, 'A', 'E')),
        'pg-route': el => { el.innerHTML = drawRoute(PG, ['A', 'C', 'E']); }
    };

    [['exam', EXAM_TREE], ['prac', PRAC_TREE]].forEach(([pfx, tree]) => {
        ['pre', 'in', 'post'].forEach(type => {
            MOUNTS[`trav-${pfx}-${type}`] = el => clickQuiz(el, travQuiz(tree, type));
            MOUNTS[`trav-${pfx}-walk-${type}`] = el => travWalk(el, tree, type);
            MOUNTS[`trav-${pfx}-ans-${type}`] = el => { el.innerHTML = seqAnswer(TNAME[type], travOrder(tree, type).map(n => n.k)); };
        });
    });

    /* ═════════════ Projector mode (Part C / D): one slide per page ═════════════ */
    // Learn slides are cloned as they are. Each question gets its own slide with a compact scenario on top;
    // the quiz widgets are mounted again on the clone so every slide keeps its own state.
    function compactScenario(sc) {
        if (!sc) return null;
        const d = document.createElement('details');
        d.className = 'proj-scenario';
        d.innerHTML = `<summary><i class="fa-solid fa-file-lines" aria-hidden="true"></i><span class="ps-title">${$('h4', sc).textContent}</span>
            <span class="scenario-for">${$('.scenario-for', sc).textContent}</span><i class="fa-solid fa-chevron-down ps-arrow" aria-hidden="true"></i></summary>
            <div class="proj-scenario-text"></div>`;
        const text = $('.proj-scenario-text', d);
        text.append($('.scenario-body p', sc).cloneNode(true));
        const key = $('.station-key', sc);
        if (key) text.append(key.cloneNode(true));
        return d;
    }
    function buildSlides(section) {
        const slides = [];
        $$('.zone-learn .learn-slide', section).forEach(n => {
            slides.push({ zone: 'Learn', title: n.dataset.slideTitle, el: n.cloneNode(true) });
        });
        [['exam', 'Exam'], ['practice', 'Practice']].forEach(([z, zone]) => {
            const zoneEl = $('.zone-' + z, section);
            if (!zoneEl) return;
            const sc = compactScenario($('.scenario', zoneEl));
            $$('.q-block', zoneEl).forEach(b => {
                const item = $('.q-item', b).cloneNode(true);
                const el = document.createElement('div');
                if (sc) el.append(sc.cloneNode(true));
                el.append(item);
                const num = $('.q-num', item).textContent;
                const s = { zone, title: 'Question ' + num, el, answerable: true, shown: false };
                // The worked answer (self-check, traps, step player) opens on this same slide, under the question
                const body = $('.answer-box .reveal-body', b);
                if (body) {
                    const ans = document.createElement('div');
                    ans.className = 'proj-ans';
                    ans.hidden = true;
                    ans.innerHTML = `<div class="proj-ans-head"><i class="fa-solid fa-circle-check"></i>Answer · Question ${num}</div><div class="proj-ans-body"></div>`;
                    // Left out: what the question's own widget shows when it walks through the answer (answer line,
                    // adjacency list, final Dijkstra table, step players, route maps). Only the teaching text stays.
                    const dup = c => /-ans(-|$)|-adj$|-dij-table$|-walk-|-(dfs|bfs|dij|dij-cut|route|route-cut)$/.test(c.dataset.mount || '');
                    const kids = [...body.children].filter((c, k, all) =>
                        !dup(c) && !(c.classList.contains('block-label') && all[k + 1] && dup(all[k + 1])));
                    $('.proj-ans-body', ans).append(...kids.map(c => c.cloneNode(true)));
                    // Inside the question card: on wide screens it sits in the left column under the question
                    if (ans.lastChild.children.length) { item.append(ans); s.ans = ans; }
                }
                slides.push(s);
            });
        });
        slides.forEach(s => {
            s.el.classList.add('proj-slide');
            // The three Dijkstra rules take a lot of height: fold them on short screens (one click opens them)
            const rules = $('.q-rules', s.el);
            if (rules) {
                const d = document.createElement('details');
                d.className = 'proj-rules';
                d.open = window.innerHeight >= 880;
                d.innerHTML = '<summary>Rules</summary>';
                rules.replaceWith(d);
                d.append(rules);
            }
            $$('[data-mount]', s.el).forEach(m => {
                m.innerHTML = ''; m.className = '';
                const fn = MOUNTS[m.dataset.mount];
                if (fn) fn(m);
            });
        });
        return slides;
    }
    function openProjector(section, opener) {
        const slides = buildSlides(section);
        if (!slides.length) return;
        // Native modal <dialog>: the page behind becomes inert, Tab stays inside, Esc and focus return come for free
        const ov = document.createElement('dialog');
        ov.className = `proj-overlay ${section.id}`;
        ov.setAttribute('aria-label', 'Projector mode');
        ov.innerHTML = `
            <div class="proj-toolbar">
                <div class="proj-title"><b>${section.id === 'part-c' ? 'Part C' : 'Part D'}</b><span class="proj-zone"></span></div>
                <span class="proj-count"></span>
                <div class="proj-tools">
                    <div class="proj-fs" role="group" aria-label="Text size">
                        <button type="button" class="btn btn-secondary" data-p="font-down" title="Smaller text (-)" aria-label="Smaller text (-)">A−</button>
                        <button type="button" class="btn btn-secondary proj-fs-val" data-p="font-reset" title="Reset text size" aria-label="Reset text size">100%</button>
                        <button type="button" class="btn btn-secondary" data-p="font-up" title="Larger text (+)" aria-label="Larger text (+)">A+</button>
                    </div>
                    <button type="button" class="btn btn-secondary" data-p="fs" title="Fullscreen (F)" aria-label="Fullscreen (F)"><i class="fa-solid fa-expand"></i></button>
                    <button type="button" class="btn btn-secondary" data-p="theme" title="Light / dark" aria-label="Switch light or dark theme"><i class="fa-solid fa-moon"></i></button>
                    <button type="button" class="btn btn-secondary" data-p="exit" title="Exit (Esc)"><i class="fa-solid fa-xmark"></i><span>Exit</span><kbd>Esc</kbd></button>
                </div>
            </div>
            <nav class="proj-progress" aria-label="Slides"></nav>
            <div class="proj-stage"></div>
            <div class="proj-bar">
                <button type="button" class="proj-btn proj-answer" data-p="answer" aria-pressed="false"><i class="fa-solid fa-eye"></i><span>Show answer</span><kbd>A</kbd></button>
                <div class="proj-nav">
                    <button type="button" class="proj-btn proj-prev" data-p="prev"><i class="fa-solid fa-arrow-left"></i><span>Previous</span><kbd>←</kbd></button>
                    <button type="button" class="proj-btn proj-next" data-p="next"><span>Next</span><kbd>→</kbd><i class="fa-solid fa-arrow-right"></i></button>
                </div>
            </div>`;
        const stage = $('.proj-stage', ov);
        slides.forEach(s => stage.append(s.el));
        // One segment per slide, coloured by zone; click to jump
        const dots = slides.map((s, k) => {
            const d = document.createElement('button');
            d.type = 'button';
            d.className = 'pp-dot z-' + s.zone.toLowerCase();
            d.dataset.p = 'go'; d.dataset.i = k;
            d.title = d.ariaLabel = `${k + 1}. ${s.zone} · ${s.title}`;
            $('.proj-progress', ov).append(d);
            return d;
        });
        document.body.append(ov);
        ov.showModal();

        let i = 0;
        const btn = (k) => $(`[data-p="${k}"]`, ov);
        const wide = matchMedia('(min-width: 1000px)');
        const syncTheme = () => { btn('theme').innerHTML = `<i class="fa-solid ${document.body.classList.contains('light-mode') ? 'fa-moon' : 'fa-sun'}"></i>`; };
        const syncFs = () => { btn('fs').innerHTML = `<i class="fa-solid ${document.fullscreenElement ? 'fa-compress' : 'fa-expand'}"></i>`; };
        const syncAnswer = () => {
            const s = slides[i], a = btn('answer');
            a.hidden = !s.answerable;
            a.classList.toggle('on', !!s.shown);
            a.setAttribute('aria-pressed', String(!!s.shown));
            $('span', a).textContent = s.shown ? 'Hide answer' : 'Show answer';
            $('i', a).className = s.shown ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        };
        // Let the tree / map take exactly the height that is left, so the boxes and Check button stay above the bar.
        const size = () => {
            const s = slides[i];
            const cs = getComputedStyle(stage);
            const room = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
            // Measure the question without its answer: the answer must not shrink the figure
            const ans = s.ans && !s.ans.hidden ? s.ans : null;
            if (ans) ans.hidden = true;
            const viz = $('.q-item .click-viz .viz', s.el);
            if (viz) {
                $$('.viz', s.el).forEach(v => { v.style.maxHeight = ''; });
                viz.style.maxHeight = '';
                const others = s.el.offsetHeight - viz.getBoundingClientRect().height;
                viz.style.maxHeight = Math.max(150, Math.min(room - others - 4, window.innerHeight * 0.56)) + 'px';
            }
            if (ans) ans.hidden = false;
            // Wide: the answer sits in the left column and scrolls inside it; narrow: the whole stage scrolls
            if (s.ans) {
                const item = $('.q-item', s.el), ics = getComputedStyle(item);
                const outside = s.el.offsetHeight - item.offsetHeight;
                // The box sits under the question: it gets what is left of the stage below it
                const above = s.ans.hidden ? 0 : s.ans.getBoundingClientRect().top - item.getBoundingClientRect().top - parseFloat(ics.paddingTop);
                s.ans.style.maxHeight = wide.matches
                    ? Math.max(120, room - outside - parseFloat(ics.paddingTop) - parseFloat(ics.paddingBottom) - above - 4) + 'px' : '';
            }
        };
        // A slide that still overflows with its answer open gives up the question (and only that slide)
        const fit = () => {
            const s = slides[i];
            s.el.classList.remove('q-folded');
            size();
            if (s.shown && wide.matches && stage.scrollHeight > stage.clientHeight + 1) {
                s.el.classList.add('q-folded');
                size();
            }
        };
        const show = (n) => {
            i = Math.max(0, Math.min(slides.length - 1, n));
            slides.forEach((s, k) => { s.el.hidden = k !== i; });
            $('.proj-zone', ov).textContent = `${slides[i].zone} · ${slides[i].title}`;
            $('.proj-count', ov).textContent = `${i + 1} / ${slides.length}`;
            dots.forEach((d, k) => {
                d.classList.toggle('on', k === i);
                d.classList.toggle('past', k < i);
                if (k === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
            });
            btn('prev').disabled = i === 0;
            btn('next').disabled = i === slides.length - 1;
            stage.scrollTop = 0;
            syncAnswer();
            fit();
        };
        const toggleAnswer = () => {
            const s = slides[i];
            if (!s.answerable) return;
            s.shown = !s.shown;
            // The question's own widget plays the answer step by step (walk mode); hiding puts the student's picks back
            $$('[data-mount]', s.el).forEach(m => {
                if (!m._quiz) return;
                if (!s.shown) m._quiz.hide();
                else if (m._quiz.walk) m._quiz.walk();
                else m._quiz.reveal();
            });
            if (s.ans) s.ans.hidden = !s.shown;
            s.el.classList.toggle('ans-open', !!s.shown);
            syncAnswer();
            fit();
            // Narrow screens stack the answer under the question: bring it into view
            if (s.ans && s.shown && !wide.matches) {
                const top = s.ans.getBoundingClientRect().top - stage.getBoundingClientRect().top;
                stage.scrollTo({ top: stage.scrollTop + top - 12 });
            }
        };
        wide.addEventListener('change', fit);
        // Text size: one number that multiplies the three type tokens (--pf-*). Remembered on this computer.
        const SCALE_KEY = 'dsa-final-proj-scale';
        let scale = 1;
        try { scale = Math.min(1.5, Math.max(0.8, parseFloat(localStorage.getItem(SCALE_KEY)) || 1)); } catch (e) { /* storage blocked: stay at 100% */ }
        const setScale = (v) => {
            scale = Math.round(Math.min(1.5, Math.max(0.8, v)) * 10) / 10;
            ov.style.setProperty('--pf-scale', scale);
            btn('font-reset').textContent = Math.round(scale * 100) + '%';
            btn('font-down').disabled = scale <= 0.8;
            btn('font-up').disabled = scale >= 1.5;
            try { localStorage.setItem(SCALE_KEY, scale); } catch (e) { /* storage blocked: not remembered */ }
            fit();
        };
        const toggleFs = () => {
            if (document.fullscreenElement) document.exitFullscreen();
            else if (ov.requestFullscreen) ov.requestFullscreen().catch((e) => console.warn('Fullscreen was blocked:', e.message));
        };
        const resizer = new ResizeObserver(fit);
        // border-box: a scrollbar appearing or disappearing must not count as a resize (that would loop)
        resizer.observe(stage, { box: 'border-box' });
        ov.addEventListener('toggle', fit, true);
        // Quiz widgets re-render on every click (new message, answer shown): refit once afterwards
        ov.addEventListener('click', () => requestAnimationFrame(fit));
        const close = () => {
            resizer.disconnect();
            wide.removeEventListener('change', fit);
            document.removeEventListener('keydown', onKey, true);
            document.removeEventListener('fullscreenchange', syncFs);
            if (document.fullscreenElement) document.exitFullscreen();
            if (ov.open) ov.close();
            ov.remove();
            if (opener) opener.focus();
        };
        const onKey = (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
            if (e.key === 'Escape') { e.preventDefault(); close(); }
            else if (typing) return;
            else if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); }
            else if (e.key === 'a' || e.key === 'A') { e.preventDefault(); toggleAnswer(); }
            else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFs(); }
            else if (e.key === '-' || e.key === '_') { e.preventDefault(); setScale(scale - 0.1); }
            else if (e.key === '+' || e.key === '=') { e.preventDefault(); setScale(scale + 0.1); }
        };
        ov.addEventListener('click', (e) => {
            const b = e.target.closest('[data-p]');
            if (!b) return;
            const a = b.dataset.p;
            if (a === 'next') show(i + 1);
            else if (a === 'prev') show(i - 1);
            else if (a === 'answer') toggleAnswer();
            else if (a === 'go') show(+b.dataset.i);
            else if (a === 'font-down') setScale(scale - 0.1);
            else if (a === 'font-up') setScale(scale + 0.1);
            else if (a === 'font-reset') setScale(1);
            else if (a === 'fs') toggleFs();
            else if (a === 'exit') close();
            else if (a === 'theme') { $('#theme-toggle-btn').click(); syncTheme(); }
        });
        document.addEventListener('keydown', onKey, true);
        document.addEventListener('fullscreenchange', syncFs);
        syncTheme();
        show(0);
        setScale(scale);
        btn('next').focus();
    }
    function initProjector() {
        const b = $('#projector-btn');
        if (!b) return;
        b.addEventListener('click', () => {
            const sec = $('.content-section.active');
            if (sec && ['part-c', 'part-d'].includes(sec.id)) openProjector(sec, b);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initShell();
        $$('[data-mount]').forEach(el => {
            const fn = MOUNTS[el.dataset.mount];
            if (fn) fn(el);
            else console.warn('Unknown widget', el.dataset.mount);
        });
        initProjector();
    });
})();
