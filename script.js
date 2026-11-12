"use strict";

const DATA_FILE = "quiz-data.json";
const OPTION_PAUSE_MS = 1400;
const BLANK_PAUSE_MS = 400;

const quizSelect = document.getElementById("quiz-select");
const quizTitle = document.getElementById("quiz-title");
const quizDetails = document.getElementById("quiz-details");
const questionProgress = document.getElementById("question-progress");
const questionText = document.getElementById("question-text");
const optionsList = document.getElementById("options-list");
const answerForm = document.getElementById("answer-form");
const answerFeedback = document.getElementById("answer-feedback");
const speechStatus = document.getElementById("speech-status");
const loadError = document.getElementById("load-error");
const previousButton = document.getElementById("previous-question");
const nextButton = document.getElementById("next-question");

const toggleQrButton = document.getElementById("toggle-qr");
const qrPanel = document.getElementById("qr-panel");
const qrCodeContainer = document.getElementById("qr-code");
const qrStatus = document.getElementById("qr-status");

const readSelectedTextButton = document.getElementById("read-selected-text");

let quizzes = [];
let currentQuiz = null;
let currentQuestionIndex = 0;
let speechRunId = 0;
let qrCodeCreated = false;

function supportsSpeech() {
  return (
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

function stopSpeech(showMessage = true) {
  speechRunId += 1;

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  speechStatus.textContent = showMessage ? "Speech stopped." : "";
}

async function speakQuestion(prompt, runId) {
  const parts = String(prompt).split(/(_+)/);

  for (const part of parts) {
    if (runId !== speechRunId) return;

    if (/^_+$/.test(part)) {
      await delay(BLANK_PAUSE_MS);
      if (runId !== speechRunId) return;

      await speakText("blank", runId);
      if (runId !== speechRunId) return;

      await delay(BLANK_PAUSE_MS);
    } else if (part.trim()) {
      await speakText(part, runId);
    }
  }
}

function speakText(text, runId) {
  return new Promise((resolve) => {
    if (runId !== speechRunId || !supportsSpeech()) {
      resolve();
      return;
    }

    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;

    utterance.onend = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.speak(utterance);
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function showQuestion() {
  if (!currentQuiz || !currentQuiz.questions.length) return;

  stopSpeech(false);

  const question = currentQuiz.questions[currentQuestionIndex];
  questionProgress.textContent =
    `Question ${currentQuestionIndex + 1} of ${currentQuiz.questions.length}`;
  questionText.textContent = question.prompt;
  answerFeedback.textContent = "";
  answerFeedback.className = "feedback";

  optionsList.replaceChildren();

  question.options.forEach((option, index) => {
    const label = document.createElement("label");
    label.className = "option-label";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "answer";
    radio.value = String(index);

    const optionText = document.createElement("span");
    optionText.textContent = `Option ${index + 1}: ${option}`;

    label.append(radio, optionText);
    optionsList.append(label);
  });

  previousButton.disabled = currentQuestionIndex === 0;
  nextButton.disabled = currentQuestionIndex === currentQuiz.questions.length - 1;
}

function displayQuiz(quiz) {
  currentQuiz = quiz;
  currentQuestionIndex = 0;

  quizTitle.textContent = quiz.quizTitle;
  quizDetails.textContent =
    `Book: ${quiz.bookTitle} · Unit: ${quiz.unitNumber} · Page: ${quiz.pageNumber}`;

  showQuestion();
}

function loadQuizzes(data) {
  if (!data || !Array.isArray(data.quizzes) || data.quizzes.length === 0) {
    throw new Error('The JSON file must contain a non-empty "quizzes" array.');
  }

  quizzes = data.quizzes;
  quizSelect.replaceChildren();

  quizzes.forEach((quiz, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = quiz.quizTitle;
    quizSelect.append(option);
  });

  displayQuiz(quizzes[0]);
}

document.getElementById("speak-question").addEventListener("click", async () => {
  if (!supportsSpeech()) {
    speechStatus.textContent = "Speech is not available in this browser.";
    return;
  }

  stopSpeech(false);
  const runId = speechRunId;
  const question = currentQuiz.questions[currentQuestionIndex];
  speechStatus.textContent = "Reading the question.";

  await speakQuestion(question.prompt, runId);

  if (runId === speechRunId) {
    speechStatus.textContent = "Finished reading the question.";
  }
});

document.getElementById("speak-options").addEventListener("click", async () => {
  if (!supportsSpeech()) {
    speechStatus.textContent = "Speech is not available in this browser.";
    return;
  }

  stopSpeech(false);
  const runId = speechRunId;
  const question = currentQuiz.questions[currentQuestionIndex];

  for (let index = 0; index < question.options.length; index += 1) {
    if (runId !== speechRunId) return;

    speechStatus.textContent =
      `Reading option ${index + 1} of ${question.options.length}.`;

    await speakText(`Option ${index + 1}. ${question.options[index]}`, runId);

    if (runId !== speechRunId) return;

    if (index < question.options.length - 1) {
      await delay(OPTION_PAUSE_MS);
    }
  }

  if (runId === speechRunId) {
    speechStatus.textContent = "Finished reading the options.";
  }
});

readSelectedTextButton.addEventListener("click", async () => {
  if (!supportsSpeech()) {
    speechStatus.textContent = "Speech is not available in this browser.";
    return;
  }

  const selectedText = window.getSelection().toString().trim();

  if (!selectedText) {
    speechStatus.textContent = "Please select some text on the page first.";
    return;
  }

  stopSpeech(false);
  const runId = speechRunId;
  speechStatus.textContent = "Reading selected text.";

  await speakText(selectedText, runId);

  if (runId === speechRunId) {
    speechStatus.textContent = "Finished reading selected text.";
  }
});

document.getElementById("stop-speech").addEventListener("click", () => {
  stopSpeech(true);
});

quizSelect.addEventListener("change", () => {
  const selectedQuiz = quizzes[Number(quizSelect.value)];
  if (selectedQuiz) displayQuiz(selectedQuiz);
});

answerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  stopSpeech(false);
  const runId = speechRunId;
  const selectedAnswer = answerForm.querySelector('input[name="answer"]:checked');

  if (!selectedAnswer) {
    const message = "Select an answer before checking.";
    answerFeedback.textContent = message;
    answerFeedback.className = "feedback incorrect";
    speechStatus.textContent = supportsSpeech()
      ? "Reading answer feedback."
      : "Speech is not available in this browser.";
    await speakText(message, runId);
    return;
  }

  const question = currentQuiz.questions[currentQuestionIndex];
  const selectedIndex = Number(selectedAnswer.value);

  if (selectedIndex === question.answerIndex) {
    const correctAnswer = question.options[question.answerIndex];
    const completedSentence = String(question.prompt)
      .replace(/_+/g, correctAnswer)
      .replace(/\s+([,.!?;:])/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim();
    const spokenFeedback = `Correct. ${completedSentence}`;

    answerFeedback.textContent = `Correct! ${completedSentence}`;
    answerFeedback.className = "feedback correct";
    speechStatus.textContent = supportsSpeech()
      ? "Correct. Reading the completed sentence."
      : "Speech is not available in this browser.";
    await speakText(spokenFeedback, runId);
  } else {
    const message = "Wrong, try again.";
    answerFeedback.textContent = message;
    answerFeedback.className = "feedback incorrect";
    speechStatus.textContent = supportsSpeech()
      ? "Reading answer feedback."
      : "Speech is not available in this browser.";
    await speakText(message, runId);
  }

  if (runId === speechRunId && supportsSpeech()) {
    speechStatus.textContent = "Finished reading answer feedback.";
  }
});

previousButton.addEventListener("click", () => {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex -= 1;
    showQuestion();
  }
});

nextButton.addEventListener("click", () => {
  if (currentQuestionIndex < currentQuiz.questions.length - 1) {
    currentQuestionIndex += 1;
    showQuestion();
  }
});

toggleQrButton.addEventListener("click", () => {
  const showQr = qrPanel.hidden;

  qrPanel.hidden = !showQr;
  toggleQrButton.setAttribute("aria-expanded", String(showQr));
  toggleQrButton.textContent = showQr ? "Hide QR code" : "Show QR code";

  if (!showQr || qrCodeCreated) return;

  if (typeof QRCode === "undefined") {
    qrStatus.textContent = "The QR-code library could not be loaded. Check your internet connection and reload the page.";
    return;
  }

  if (!/^https?:$/.test(window.location.protocol)) {
    qrStatus.textContent = "Open the hosted quiz page to create a QR code students can scan.";
    return;
  }

  new QRCode(qrCodeContainer, {
    text: window.location.href,
    width: 220,
    height: 220,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });

  qrCodeCreated = true;
});

async function start() {
  try {
    const response = await fetch(DATA_FILE);

    if (!response.ok) {
      throw new Error(`Could not load ${DATA_FILE} (HTTP ${response.status}).`);
    }

    loadQuizzes(await response.json());
  } catch (error) {
    console.error(error);
    quizTitle.textContent = "Quiz could not be loaded";
    loadError.hidden = false;
    loadError.textContent =
      `${error.message} Make sure the JSON file is in the same folder and ` +
      "open this page using a local web server, such as VS Code Live Server.";
  }
}

start();