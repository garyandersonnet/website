/**
 * Shared Peterson Academy practice-quiz player.
 * Catalog overlay calls window.PaQuiz.fetchAndRender / unlockAudio
 * (see PetersonAcademy.html). Loaded from this PHIL-102 path for every course.
 */
(function (global) {
  "use strict";

  var MUTE_KEY = "pa-quiz-muted";
  var SCORE_PREFIX = "pa-quiz-score:";
  var FINAL_SECONDS = 60;
  var FEEDBACK_ADVANCE_MS = 2800;

  var audioCtx = null;
  var activeTimer = null;
  var activeAdvance = null;

  function $(el, sel) {
    return el.querySelector(sel);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isFinalQuiz(quiz) {
    var kind = String((quiz && quiz.kind) || "").toLowerCase();
    var lec = String((quiz && quiz.lecture) || "");
    var title = String((quiz && quiz.title) || "");
    return kind === "final" || lec.toLowerCase() === "final" || /final exam/i.test(title);
  }

  function defaultMuted() {
    try {
      var v = localStorage.getItem(MUTE_KEY);
      if (v === null || v === "") return true;
      return v === "1" || v === "true";
    } catch (e) {
      return true;
    }
  }

  function persistMuted(on) {
    try {
      localStorage.setItem(MUTE_KEY, on ? "1" : "0");
    } catch (e) {}
  }

  function scoreKey(quiz) {
    return SCORE_PREFIX + String((quiz && quiz.id) || "unknown");
  }

  function readBest(quiz) {
    try {
      var raw = localStorage.getItem(scoreKey(quiz));
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data.best !== "number") return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function writeScore(quiz, correct, total) {
    var prev = readBest(quiz) || {};
    var best = typeof prev.best === "number" ? prev.best : -1;
    var rec = {
      best: Math.max(best, correct),
      total: total,
      last: correct,
      at: new Date().toISOString()
    };
    try {
      localStorage.setItem(scoreKey(quiz), JSON.stringify(rec));
    } catch (e) {}
    return rec;
  }

  function unlockAudio() {
    try {
      var Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) {}
  }

  function tone(ctx, type, freq, t0, dur, gain, dest) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest || ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    return osc;
  }

  function playFanfare() {
    if (defaultMuted()) return;
    unlockAudio();
    if (!audioCtx) return;
    var ctx = audioCtx;
    var t0 = ctx.currentTime + 0.02;
    var notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    notes.forEach(function (f, i) {
      var start = t0 + i * 0.11;
      tone(ctx, "sawtooth", f, start, 0.22, 0.07);
      tone(ctx, "square", f * 0.5, start, 0.22, 0.035);
    });
    tone(ctx, "triangle", 261.63, t0, 0.85, 0.04);
  }

  function playWahWah() {
    if (defaultMuted()) return;
    unlockAudio();
    if (!audioCtx) return;
    var ctx = audioCtx;
    var t0 = ctx.currentTime + 0.02;
    var notes = [196.0, 174.61, 146.83];
    notes.forEach(function (f, i) {
      var start = t0 + i * 0.28;
      var osc = ctx.createOscillator();
      var filt = ctx.createBiquadFilter();
      var g = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f, start);
      osc.frequency.exponentialRampToValueAtTime(f * 0.92, start + 0.26);
      filt.type = "lowpass";
      filt.Q.value = 8;
      filt.frequency.setValueAtTime(420, start);
      filt.frequency.linearRampToValueAtTime(180, start + 0.12);
      filt.frequency.linearRampToValueAtTime(520, start + 0.22);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.09, start + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(filt);
      filt.connect(g);
      g.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
  }

  function clearTimers() {
    if (activeTimer) {
      clearInterval(activeTimer);
      activeTimer = null;
    }
    if (activeAdvance) {
      clearTimeout(activeAdvance);
      activeAdvance = null;
    }
  }

  function choiceText(choices, idx) {
    if (idx == null || idx < 0 || !choices || !choices[idx]) return "(none)";
    return String(choices[idx]);
  }

  function formatTime(sec) {
    var s = Math.max(0, Math.ceil(sec));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function buildTutorText(quiz, results) {
    var missed = results.filter(function (r) { return !r.ok; });
    var lines = [];
    lines.push("Tutor remaster report — " + (quiz.course || "") + " — " + (quiz.title || quiz.id || "quiz"));
    lines.push("Score: " + results.filter(function (r) { return r.ok; }).length + "/" + results.length);
    lines.push("");
    if (!missed.length) {
      lines.push("No missed or timed-out questions. Optional review of the numbered transcript is still useful.");
    } else {
      lines.push("Please re-teach these numbered-transcript paragraphs and help me master the missed items.");
      lines.push("");
      missed.forEach(function (r, n) {
        var q = r.question;
        lines.push((n + 1) + ") " + q.prompt);
        lines.push("   My answer: " + (r.timedOut ? "Time expired" : choiceText(q.choices, r.picked)));
        lines.push("   Correct: " + choiceText(q.choices, q.answer));
        lines.push("   Citation: ¶ " + (q.cite || "?"));
        lines.push("   Why: " + (q.explain || ""));
        lines.push("   Tutor ask: Please re-teach paragraph " + (q.cite || "?") + " from the numbered transcript.");
        lines.push("");
      });
    }
    var cites = [];
    missed.forEach(function (r) {
      var c = r.question && r.question.cite;
      if (c && cites.indexOf(c) < 0) cites.push(c);
    });
    if (cites.length) {
      lines.push("Citation list: " + cites.map(function (c) { return "¶ " + c; }).join(", "));
      lines.push("");
    }
    lines.push("Suggested prompt: Using the numbered transcript for this course, re-teach the cited paragraphs above. For each miss, explain the correct answer, why my choice was wrong, and give one new check question.");
    return lines.join("\n");
  }

  function copyText(text, btn) {
    function ok() {
      if (!btn) return;
      var prev = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(function () { btn.textContent = prev; }, 1400);
    }
    if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(function () {
        fallbackCopy(text, ok);
      });
    } else {
      fallbackCopy(text, ok);
    }
  }

  function fallbackCopy(text, ok) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) ok();
    } catch (e) {}
  }

  function normalizeQuiz(raw) {
    var quiz = raw || {};
    var questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    quiz.questions = questions.map(function (q, i) {
      var choices = Array.isArray(q.choices) ? q.choices.slice(0, 4) : [];
      var answer = Number(q.answer);
      if (!(answer >= 0 && answer <= 3)) answer = 0;
      return {
        id: q.id || ("q" + (i + 1)),
        prompt: q.prompt || "",
        choices: choices,
        answer: answer,
        cite: q.cite || "",
        explain: q.explain || ""
      };
    });
    return quiz;
  }

  function render(root, rawQuiz, opts) {
    opts = opts || {};
    clearTimers();
    var quiz = normalizeQuiz(rawQuiz);
    var questions = quiz.questions;
    if (!root) return;
    if (!questions.length) {
      root.innerHTML = '<p class="pa-quiz__error">This quiz has no questions.</p>';
      return;
    }

    var finalExam = isFinalQuiz(quiz);
    var muted = defaultMuted();
    var idx = 0;
    var correctCount = 0;
    var answered = false;
    var results = [];
    var best = readBest(quiz);
    var remaining = FINAL_SECONDS;
    var doneCalled = false;

    root.innerHTML =
      '<div class="pa-quiz" data-kind="' + (finalExam ? "final" : "lecture") + '">' +
        '<div class="pa-quiz__hud">' +
          '<div class="pa-quiz__hud-main">' +
            '<span class="pa-quiz__progress"></span>' +
            '<span class="pa-quiz__score"></span>' +
            '<span class="pa-quiz__best"></span>' +
          "</div>" +
          '<div class="pa-quiz__hud-tools">' +
            '<span class="pa-quiz__timer" hidden></span>' +
            '<button type="button" class="pa-quiz__mute" aria-pressed="true"></button>' +
          "</div>" +
        "</div>" +
        '<div class="pa-quiz__body"></div>' +
      "</div>";

    var wrap = $(root, ".pa-quiz");
    var progressEl = $(wrap, ".pa-quiz__progress");
    var scoreEl = $(wrap, ".pa-quiz__score");
    var bestEl = $(wrap, ".pa-quiz__best");
    var timerEl = $(wrap, ".pa-quiz__timer");
    var muteBtn = $(wrap, ".pa-quiz__mute");
    var body = $(wrap, ".pa-quiz__body");

    function paintMute() {
      muteBtn.textContent = muted ? "Sound off" : "Sound on";
      muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
      muteBtn.title = muted ? "Unmute brass sounds" : "Mute brass sounds";
    }

    muteBtn.addEventListener("click", function () {
      muted = !muted;
      persistMuted(muted);
      paintMute();
      if (!muted) unlockAudio();
    });
    paintMute();

    function paintHud() {
      progressEl.textContent = "Q " + (Math.min(idx, questions.length - 1) + 1) + " / " + questions.length;
      scoreEl.textContent = "Score " + correctCount + "/" + questions.length;
      if (best && typeof best.best === "number") {
        bestEl.hidden = false;
        bestEl.textContent = "Best " + best.best + "/" + (best.total || questions.length);
      } else {
        bestEl.hidden = true;
        bestEl.textContent = "";
      }
    }

    function stopTimer() {
      if (activeTimer) {
        clearInterval(activeTimer);
        activeTimer = null;
      }
    }

    function startTimer() {
      stopTimer();
      if (!finalExam) {
        timerEl.hidden = true;
        return;
      }
      remaining = FINAL_SECONDS;
      timerEl.hidden = false;
      timerEl.classList.remove("is-low");
      timerEl.textContent = formatTime(remaining);
      activeTimer = setInterval(function () {
        remaining -= 1;
        timerEl.textContent = formatTime(remaining);
        timerEl.classList.toggle("is-low", remaining <= 10);
        if (remaining <= 0) {
          stopTimer();
          if (!answered) grade(-1, true);
        }
      }, 1000);
    }

    function showQuestion() {
      answered = false;
      clearTimeout(activeAdvance);
      activeAdvance = null;
      var q = questions[idx];
      var citeOnQuestion = !finalExam && q.cite;
      var html = "";
      if (citeOnQuestion) {
        html += '<p class="pa-quiz__cite">Citation: ¶ ' + esc(q.cite) + "</p>";
      }
      html += '<p class="pa-quiz__prompt">' + esc(q.prompt) + "</p>";
      html += '<div class="pa-quiz__choices" role="group" aria-label="Answer choices">';
      q.choices.forEach(function (ch, i) {
        html +=
          '<button type="button" class="pa-quiz__choice" data-choice="' + i + '">' +
            '<span class="pa-quiz__choice-text">' + esc(ch) + "</span>" +
          "</button>";
      });
      html += "</div>";
      html += '<div class="pa-quiz__feedback" hidden></div>';
      html += '<div class="pa-quiz__nav">';
      html += '<button type="button" class="pa-quiz__next" hidden>Next</button>';
      html += "</div>";
      body.innerHTML = html;
      paintHud();
      Array.prototype.forEach.call(body.querySelectorAll(".pa-quiz__choice"), function (btn) {
        btn.addEventListener("click", function () {
          if (answered) return;
          grade(parseInt(btn.getAttribute("data-choice"), 10), false);
        });
      });
      var nextBtn = $(body, ".pa-quiz__next");
      nextBtn.addEventListener("click", function () {
        goNext();
      });
      startTimer();
    }

    function grade(picked, timedOut) {
      if (answered) return;
      answered = true;
      stopTimer();
      var q = questions[idx];
      var ok = !timedOut && picked === q.answer;
      if (ok) correctCount += 1;
      results.push({
        question: q,
        picked: picked,
        timedOut: !!timedOut,
        ok: ok
      });
      if (ok) playFanfare();
      else playWahWah();

      Array.prototype.forEach.call(body.querySelectorAll(".pa-quiz__choice"), function (btn) {
        var i = parseInt(btn.getAttribute("data-choice"), 10);
        btn.disabled = true;
        if (i === q.answer) btn.classList.add("is-correct");
        if (!timedOut && i === picked && picked !== q.answer) btn.classList.add("is-wrong");
      });

      var fb = $(body, ".pa-quiz__feedback");
      var bits = [];
      if (timedOut) bits.push('<strong>Time’s up.</strong> Marked incorrect.');
      else if (ok) bits.push("<strong>Correct.</strong>");
      else bits.push("<strong>Incorrect.</strong>");
      bits.push("Answer: " + esc(choiceText(q.choices, q.answer)));
      if (q.cite) bits.push("Citation: ¶ " + esc(q.cite));
      if (q.explain) bits.push(esc(q.explain));
      fb.hidden = false;
      fb.className = "pa-quiz__feedback " + (ok ? "is-ok" : "is-bad");
      fb.innerHTML = bits.join("<br>");

      var nextBtn = $(body, ".pa-quiz__next");
      nextBtn.hidden = false;
      nextBtn.textContent = idx >= questions.length - 1 ? "See results" : "Next";
      paintHud();

      if (finalExam) {
        activeAdvance = setTimeout(function () {
          if (answered) goNext();
        }, FEEDBACK_ADVANCE_MS);
      }
    }

    function goNext() {
      clearTimeout(activeAdvance);
      activeAdvance = null;
      if (!answered) return;
      if (idx >= questions.length - 1) {
        finish();
        return;
      }
      idx += 1;
      showQuestion();
    }

    function finish() {
      stopTimer();
      timerEl.hidden = true;
      var rec = writeScore(quiz, correctCount, questions.length);
      best = rec;
      paintHud();
      progressEl.textContent = "Done";
      var missed = results.filter(function (r) { return !r.ok; });
      var tutor = buildTutorText(quiz, results);
      var html = '<div class="pa-quiz__report">';
      html += "<h3>Finished</h3>";
      html += '<p class="pa-quiz__final-score">You scored <strong>' + correctCount + "/" + questions.length + "</strong>";
      if (rec && rec.best === correctCount) html += " — this is your best on this device.";
      else if (rec) html += " — best on this device: " + rec.best + "/" + rec.total + ".";
      html += "</p>";
      html += "<h3>Tutor remaster report</h3>";
      if (!missed.length) {
        html += "<p>No missed or timed-out questions. Keep the numbered transcript handy for review.</p>";
      } else {
        html += "<ol class=\"pa-quiz__misses\">";
        missed.forEach(function (r) {
          var q = r.question;
          html += "<li>";
          html += "<p class=\"pa-quiz__miss-prompt\">" + esc(q.prompt) + "</p>";
          html += "<p>Your answer: " + esc(r.timedOut ? "Time expired" : choiceText(q.choices, r.picked)) + "</p>";
          html += "<p>Correct: " + esc(choiceText(q.choices, q.answer)) + "</p>";
          html += "<p>Source cite: ¶ " + esc(q.cite || "?") + "</p>";
          html += "<p>" + esc(q.explain || "") + "</p>";
          html += "<p class=\"pa-quiz__tutor-ask\">Tutor ask: please re-teach paragraph " + esc(q.cite || "?") + ".</p>";
          html += "</li>";
        });
        html += "</ol>";
        var cites = [];
        missed.forEach(function (r) {
          if (r.question.cite && cites.indexOf(r.question.cite) < 0) cites.push(r.question.cite);
        });
        html += "<p class=\"pa-quiz__cite-list\"><strong>Citation list:</strong> " +
          cites.map(function (c) { return "¶ " + esc(c); }).join(", ") + "</p>";
      }
      html += "<p class=\"pa-quiz__prompt-hint\">Suggested paste-prompt for an AI or human tutor plus the numbered transcript is included when you copy.</p>";
      html += '<button type="button" class="pa-quiz__copy">Copy for tutor</button>';
      html += '<pre class="pa-quiz__tutor-text" hidden></pre>';
      html += "</div>";
      body.innerHTML = html;
      $(body, ".pa-quiz__copy").addEventListener("click", function (ev) {
        copyText(tutor, ev.currentTarget);
      });
      if (!doneCalled) {
        doneCalled = true;
        if (typeof opts.onDone === "function") {
          try { opts.onDone(quiz, { correct: correctCount, total: questions.length }); }
          catch (e) { console.error(e); }
        }
      }
    }

    showQuestion();
  }

  function fetchAndRender(root, url, opts) {
    opts = opts || {};
    if (!root) return Promise.reject(new Error("PaQuiz: missing root"));
    clearTimers();
    root.innerHTML = '<p class="pa-quiz__loading">Loading quiz…</p>';
    return fetch(url, { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (quiz) {
        render(root, quiz, opts);
        return quiz;
      })
      .catch(function (err) {
        console.error("PaQuiz.fetchAndRender failed", err);
        root.innerHTML = '<p class="pa-quiz__error">Could not load this quiz. Try another lecture, or reload the page.</p>';
        throw err;
      });
  }

  global.PaQuiz = {
    fetchAndRender: fetchAndRender,
    unlockAudio: unlockAudio,
    render: render
  };
})(window);
