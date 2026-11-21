import React, {useEffect, useMemo, useState} from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import {useLibrary} from '../context/LibraryContext';
import {
  BookContent,
  QuizAnswerRecord,
  QuizAttempt,
  QuizDifficulty,
  QuizQuestion,
  QuizQuestionType,
} from '../types/library';
import {
  generateBookQuiz,
  getBookMaxReadPage,
  isTextAnswerMatch,
} from '../utils/quizGenerator';

const DIFFICULTY_LABELS: Record<QuizDifficulty, string> = {
  easy: 'Лёгкая',
  medium: 'Средняя',
  hard: 'Сложная',
};

const TYPE_LABELS: Record<QuizQuestionType, string> = {
  single_choice: 'Выбор одного ответа',
  multi_choice: 'Выбор нескольких ответов',
  true_false: 'Правда или ложь',
  text_input: 'Самостоятельный ввод',
  sequence: 'Последовательность событий',
  character_guess: 'Угадайте персонажа / объект',
  detail_event: 'Детали и главы',
};

const QUESTION_COUNTS = [5, 8, 12, 15, 20];

type QuizStage = 'setup' | 'running' | 'summary';

export const QuizView: React.FC = () => {
  const {
    books,
    journals,
    quizAttempts,
    quizBookId,
    getBookContent,
    saveQuizAttempt,
    deleteQuizAttempt,
    openBookInReader,
    settings,
    showToast,
  } = useLibrary();

  const [selectedBookId, setSelectedBookId] = useState<string>(
    quizBookId || books[0]?.id || ''
  );
  const [content, setContent] = useState<BookContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Setup state
  const [spoilerFree, setSpoilerFree] = useState(true);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium');
  const [questionCount, setQuestionCount] = useState<number>(8);

  // Active quiz session state
  const [stage, setStage] = useState<QuizStage>('setup');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizAnswerRecord>>({});
  const [submittedCurrent, setSubmittedCurrent] = useState(false);
  const [isRetryWrongRun, setIsRetryWrongRun] = useState(false);
  const [lastSavedAttempt, setLastSavedAttempt] = useState<QuizAttempt | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Draft input for current question (strictly unrevealed until submit)
  const [draftSingle, setDraftSingle] = useState<number | null>(null);
  const [draftMulti, setDraftMulti] = useState<number[]>([]);
  const [draftText, setDraftText] = useState('');
  const [draftSequence, setDraftSequence] = useState<string[]>([]);

  useEffect(() => {
    if (quizBookId && books.some((b) => b.id === quizBookId)) {
      setSelectedBookId(quizBookId);
      setStage('setup');
    } else if (!selectedBookId && books[0]) {
      setSelectedBookId(books[0].id);
    }
  }, [quizBookId, books, selectedBookId]);

  const selectedBook = useMemo(
    () => books.find((b) => b.id === selectedBookId) || null,
    [books, selectedBookId]
  );

  useEffect(() => {
    if (!selectedBookId) {
      setContent(null);
      return;
    }
    let active = true;
    setLoadingContent(true);
    getBookContent(selectedBookId).then((res) => {
      if (!active) return;
      setContent(res || null);
      setLoadingContent(false);
      setSelectedChapterIds([]);
    });
    return () => {
      active = false;
    };
  }, [selectedBookId, getBookContent]);

  const bookAttempts = useMemo(
    () => quizAttempts.filter((q) => q.bookId === selectedBookId),
    [quizAttempts, selectedBookId]
  );

  const usedSignaturesForBook = useMemo(() => {
    const set = new Set<string>();
    for (const att of bookAttempts) {
      for (const sig of att.usedSignatures || []) {
        set.add(sig);
      }
    }
    return set;
  }, [bookAttempts]);

  const maxReadPage = selectedBook ? getBookMaxReadPage(selectedBook) : 0;

  const availableChapters = useMemo(() => {
    if (!content) return [];
    if (!spoilerFree) return content.chapters;
    return content.chapters.filter((ch) => ch.startPageIndex <= maxReadPage);
  }, [content, spoilerFree, maxReadPage]);

  const currentQuestion = questions[currentIdx] || null;

  const resetDraftForQuestion = (q: QuizQuestion | undefined) => {
    setDraftSingle(null);
    setDraftMulti([]);
    setDraftText('');
    setDraftSequence(q?.sequenceItems ? [...q.sequenceItems] : []);
    setSubmittedCurrent(false);
  };

  const toggleChapter = (chId: string) => {
    setSelectedChapterIds((prev) =>
      prev.includes(chId) ? prev.filter((id) => id !== chId) : [...prev, chId]
    );
  };

  const startNewQuiz = (excludePrevious = true) => {
    if (!selectedBook || !content) return;
    const journal = journals.find((j) => j.bookId === selectedBook.id);
    const generated = generateBookQuiz({
      book: selectedBook,
      content,
      journal,
      chapterIds: selectedChapterIds,
      difficulty,
      count: questionCount,
      spoilerFree,
      excludeSignatures: excludePrevious ? usedSignaturesForBook : new Set<string>(),
    });

    if (generated.length === 0) {
      showToast(
        spoilerFree
          ? 'В прочитанных страницах недостаточно текста для вопросов. Прочитайте ещё пару страниц или снимите фильтр спойлеров.'
          : 'Недостаточно текста в выбранных главах для генерации вопросов.'
      );
      return;
    }

    setQuestions(generated);
    setCurrentIdx(0);
    setAnswers({});
    setIsRetryWrongRun(false);
    setLastSavedAttempt(null);
    resetDraftForQuestion(generated[0]);
    setStage('running');
  };

  const startRetryWrongQuestions = (sourceQuestions: QuizQuestion[], wrongIds: string[]) => {
    const wrongSet = new Set(wrongIds);
    const subset = sourceQuestions.filter((q) => wrongSet.has(q.id));
    if (subset.length === 0) return;
    setQuestions(subset);
    setCurrentIdx(0);
    setAnswers({});
    setIsRetryWrongRun(true);
    setLastSavedAttempt(null);
    resetDraftForQuestion(subset[0]);
    setStage('running');
  };

  const canSubmitCurrent = useMemo(() => {
    if (!currentQuestion || submittedCurrent) return false;
    if (
      currentQuestion.type === 'single_choice' ||
      currentQuestion.type === 'true_false' ||
      currentQuestion.type === 'character_guess' ||
      currentQuestion.type === 'detail_event'
    ) {
      return draftSingle !== null;
    }
    if (currentQuestion.type === 'multi_choice') {
      return draftMulti.length > 0;
    }
    if (currentQuestion.type === 'text_input') {
      return draftText.trim().length > 0;
    }
    if (currentQuestion.type === 'sequence') {
      return draftSequence.length > 0;
    }
    return false;
  }, [currentQuestion, submittedCurrent, draftSingle, draftMulti, draftText, draftSequence]);

  const handleSubmitAnswer = () => {
    if (!currentQuestion || !canSubmitCurrent) return;

    let isCorrect = false;
    let userAnswerDisplay = '';

    if (
      currentQuestion.type === 'single_choice' ||
      currentQuestion.type === 'true_false' ||
      currentQuestion.type === 'character_guess' ||
      currentQuestion.type === 'detail_event'
    ) {
      isCorrect = draftSingle === currentQuestion.correctSingleIndex;
      userAnswerDisplay =
        draftSingle !== null ? currentQuestion.options?.[draftSingle] || '' : '';
    } else if (currentQuestion.type === 'multi_choice') {
      const expected = [...(currentQuestion.correctMultiIndices || [])].sort((a, b) => a - b);
      const actual = [...draftMulti].sort((a, b) => a - b);
      isCorrect =
        expected.length === actual.length && expected.every((v, idx) => v === actual[idx]);
      userAnswerDisplay = actual.map((i) => currentQuestion.options?.[i] || '').join(' · ');
    } else if (currentQuestion.type === 'text_input') {
      isCorrect = isTextAnswerMatch(draftText, currentQuestion.acceptableAnswers || []);
      userAnswerDisplay = draftText.trim();
    } else if (currentQuestion.type === 'sequence') {
      const expected = currentQuestion.correctSequenceOrder || [];
      isCorrect =
        expected.length === draftSequence.length &&
        expected.every((item, idx) => item === draftSequence[idx]);
      userAnswerDisplay = draftSequence
        .map((s, idx) => `${idx + 1}. ${s.slice(0, 42)}…`)
        .join(' | ');
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        questionId: currentQuestion.id,
        userAnswerDisplay,
        isCorrect,
      },
    }));
    setSubmittedCurrent(true);
  };

  const handleNextOrFinish = async () => {
    if (currentIdx + 1 < questions.length) {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      resetDraftForQuestion(questions[next]);
      return;
    }

    // Complete quiz & persist attempt
    if (!selectedBook) return;
    const correctCount = questions.filter((q) => answers[q.id]?.isCorrect).length;
    const wrongIds = questions.filter((q) => !answers[q.id]?.isCorrect).map((q) => q.id);
    const scorePercent = Math.round((correctCount / Math.max(1, questions.length)) * 100);

    const attempt: QuizAttempt = {
      id: `qza_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      bookId: selectedBook.id,
      bookTitle: selectedBook.title,
      date: Date.now(),
      difficulty,
      spoilerFree,
      chapterIds: selectedChapterIds,
      totalQuestions: questions.length,
      correctCount,
      scorePercent,
      questions,
      answers,
      wrongQuestionIds: wrongIds,
      usedSignatures: questions.map((q) => q.signature),
    };

    await saveQuizAttempt(attempt);
    setLastSavedAttempt(attempt);
    setStage('summary');
  };

  const moveSeqItem = (idx: number, dir: -1 | 1) => {
    if (submittedCurrent) return;
    const target = idx + dir;
    if (target < 0 || target >= draftSequence.length) return;
    setDraftSequence((prev) => {
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  };

  const getCorrectDisplay = (q: QuizQuestion): string => {
    if (
      q.type === 'single_choice' ||
      q.type === 'true_false' ||
      q.type === 'character_guess' ||
      q.type === 'detail_event'
    ) {
      return q.correctSingleIndex !== undefined ? q.options?.[q.correctSingleIndex] || '' : '';
    }
    if (q.type === 'multi_choice') {
      return (q.correctMultiIndices || []).map((i) => q.options?.[i] || '').join(' · ');
    }
    if (q.type === 'text_input') {
      return (q.acceptableAnswers || []).join(', ');
    }
    if (q.type === 'sequence') {
      return (q.correctSequenceOrder || [])
        .map((s, idx) => `${idx + 1}. ${s.slice(0, 60)}…`)
        .join(' → ');
    }
    return '';
  };

  const animEnabled = settings.animationLevel !== 'off';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Что я помню?</h1>
          <p className="text-xs mt-1" style={{color: 'var(--site-text-muted)'}}>
            Интерактивный тест на память по содержанию ваших книг — с защитой от спойлеров и историей попыток
          </p>
        </div>

        {stage !== 'setup' && (
          <button
            onClick={() => setStage('setup')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium whitespace-nowrap shrink-0"
            style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
          >
            <RotateCcw className="w-3.5 h-3.5" /> К настройкам теста
          </button>
        )}
      </div>

      {/* Book Selector Strip */}
      {stage === 'setup' && (
        <div
          className="rounded-2xl border p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <div className="space-y-1 min-w-[220px] flex-1">
            <label className="text-xs font-medium block" style={{color: 'var(--site-text-muted)'}}>
              Выберите книгу для проверки памяти
            </label>
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="w-full max-w-md rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none"
              style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} — {b.author} ({b.scrollProgress || 0}%)
                </option>
              ))}
            </select>
          </div>

          {selectedBook && (
            <div className="text-xs space-y-1 text-right">
              <p className="font-medium">
                Пройдено: {selectedBook.scrollProgress || 0}% · стр. {maxReadPage + 1} из{' '}
                {selectedBook.totalPages}
              </p>
              <p style={{color: 'var(--site-text-muted)'}}>
                Пройдено тестов: {bookAttempts.length} · Уникальных вопросов в истории:{' '}
                {usedSignaturesForBook.size}
              </p>
            </div>
          )}
        </div>
      )}

      {!selectedBook ? (
        <div
          className="rounded-2xl border p-10 text-center space-y-2"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <Brain className="w-8 h-8 mx-auto opacity-45" />
          <p className="font-display text-2xl font-semibold">В библиотеке пока нет книг</p>
          <p className="text-xs" style={{color: 'var(--site-text-muted)'}}>
            Добавьте книгу, чтобы проверять память по главам и событиям сюжета.
          </p>
        </div>
      ) : stage === 'setup' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Quiz Config Card */}
          <section
            className="lg:col-span-7 rounded-3xl border p-5 sm:p-6 space-y-5"
            style={{
              backgroundColor: 'var(--site-surface)',
              borderColor: 'var(--site-border)',
              boxShadow: 'var(--site-shadow)',
            }}
          >
            {/* Spoiler-free toggle */}
            <div
              className="rounded-2xl border p-4 flex items-start justify-between gap-4"
              style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4" style={{color: 'var(--site-accent)'}} />
                  <span>Режим без спойлеров</span>
                </div>
                <p className="text-xs leading-relaxed" style={{color: 'var(--site-text-muted)'}}>
                  {spoilerFree
                    ? `Вопросы формируются строго до страницы ${maxReadPage + 1} (${availableChapters.length} из ${
                        content?.chapters.length || selectedBook.toc.length
                      } глав), которую вы уже открывали.`
                    : 'Режим выключен — вопросы могут включать любые главы до самого финала книги.'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={spoilerFree}
                onChange={(e) => setSpoilerFree(e.target.checked)}
                className="w-5 h-5 mt-0.5 accent-[var(--site-accent)] cursor-pointer shrink-0"
              />
            </div>

            {/* Difficulty & Count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs font-semibold block">Сложность вопросов</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['easy', 'medium', 'hard'] as QuizDifficulty[]).map((diff) => {
                    const active = difficulty === diff;
                    return (
                      <button
                        key={diff}
                        onClick={() => setDifficulty(diff)}
                        className="py-2 px-2 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap"
                        style={{
                          borderColor: active ? 'var(--site-accent)' : 'var(--site-border)',
                          backgroundColor: active ? 'var(--site-accent)' : 'var(--site-bg)',
                          color: active ? 'var(--site-accent-contrast)' : 'var(--site-text)',
                        }}
                      >
                        {DIFFICULTY_LABELS[diff]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold block">Количество вопросов</span>
                <div className="flex flex-wrap gap-1.5">
                  {QUESTION_COUNTS.map((cnt) => {
                    const active = questionCount === cnt;
                    return (
                      <button
                        key={cnt}
                        onClick={() => setQuestionCount(cnt)}
                        className="px-3 py-2 rounded-xl border text-xs font-mono-num font-medium transition-colors"
                        style={{
                          borderColor: active ? 'var(--site-accent)' : 'var(--site-border)',
                          backgroundColor: active ? 'var(--site-accent)' : 'var(--site-bg)',
                          color: active ? 'var(--site-accent-contrast)' : 'var(--site-text)',
                        }}
                      >
                        {cnt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chapter Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Главы для теста</span>
                <button
                  onClick={() => setSelectedChapterIds([])}
                  className="text-xs underline"
                  style={{color: 'var(--site-accent)'}}
                >
                  {selectedChapterIds.length === 0
                    ? 'Выбраны все доступные главы'
                    : 'Сбросить (вся доступная книга)'}
                </button>
              </div>

              {loadingContent ? (
                <p className="text-xs opacity-60 py-3">Загружаем оглавление книги…</p>
              ) : availableChapters.length === 0 ? (
                <p className="text-xs opacity-65 py-2">
                  Текст книги состоит из одной секции или пока не пролистан дальше первой страницы.
                </p>
              ) : (
                <div className="max-h-52 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
                  {availableChapters.map((ch) => {
                    const checked = selectedChapterIds.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => toggleChapter(ch.id)}
                        className="text-left px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors"
                        style={{
                          borderColor: checked ? 'var(--site-accent)' : 'var(--site-border)',
                          backgroundColor: checked ? 'var(--site-surface-alt)' : 'var(--site-bg)',
                        }}
                      >
                        <span className="truncate">{ch.title}</span>
                        <span className="font-mono-num text-[11px] opacity-60 shrink-0">
                          стр. {ch.startPageIndex + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Start CTA */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px]" style={{color: 'var(--site-text-muted)'}}>
                Типы: выбор ответа · несколько ответов · правда/ложь · ввод · хронология · персонажи
              </p>
              <button
                onClick={() => startNewQuiz(true)}
                disabled={loadingContent || !content}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium disabled:opacity-50 whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: 'var(--site-accent)',
                  color: 'var(--site-accent-contrast)',
                }}
              >
                <Play className="w-4 h-4" /> Начать тест
              </button>
            </div>
          </section>

          {/* Quiz History Panel */}
          <section
            className="lg:col-span-5 rounded-3xl border p-5 sm:p-6 space-y-4"
            style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <History className="w-4 h-4" /> История тестов книги
              </h2>
              <span className="font-mono-num text-xs" style={{color: 'var(--site-text-muted)'}}>
                {bookAttempts.length}
              </span>
            </div>

            {bookAttempts.length === 0 ? (
              <p className="text-xs py-6 text-center" style={{color: 'var(--site-text-muted)'}}>
                По этой книге ещё нет сохранённых попыток. Пройдите первый тест, чтобы увидеть динамику памяти.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {bookAttempts.map((att) => {
                  const isOpen = expandedHistoryId === att.id;
                  return (
                    <div
                      key={att.id}
                      className="rounded-2xl border p-3.5 space-y-2.5"
                      style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold font-mono-num">
                            {att.scorePercent}% · {att.correctCount} из {att.totalQuestions}
                          </p>
                          <p className="text-[11px] mt-0.5" style={{color: 'var(--site-text-muted)'}}>
                            {new Date(att.date).toLocaleDateString('ru-RU')} ·{' '}
                            {DIFFICULTY_LABELS[att.difficulty]} ·{' '}
                            {att.spoilerFree ? 'Без спойлеров' : 'Вся книга'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setExpandedHistoryId(isOpen ? null : att.id)}
                            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                            title="Детали попытки"
                          >
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => deleteQuizAttempt(att.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600"
                            title="Удалить из истории"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {att.wrongQuestionIds.length > 0 && (
                        <button
                          onClick={() => startRetryWrongQuestions(att.questions, att.wrongQuestionIds)}
                          className="text-xs font-medium inline-flex items-center gap-1 hover:underline"
                          style={{color: 'var(--site-accent)'}}
                        >
                          <RefreshCw className="w-3 h-3" /> Повторить ошибки ({att.wrongQuestionIds.length})
                        </button>
                      )}

                      {isOpen && (
                        <div className="pt-2 border-t space-y-2 text-xs" style={{borderColor: 'var(--site-border)'}}>
                          {att.questions.map((q, qIdx) => {
                            const ans = att.answers[q.id];
                            return (
                              <div key={q.id} className="space-y-0.5">
                                <p className="font-medium flex items-start gap-1.5">
                                  {ans?.isCorrect ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                                  )}
                                  <span className="line-clamp-2">
                                    {qIdx + 1}. {q.prompt.split('\n')[0]}
                                  </span>
                                </p>
                                {!ans?.isCorrect && (
                                  <p className="pl-5 text-[11px]" style={{color: 'var(--site-text-muted)'}}>
                                    Ответ: {getCorrectDisplay(q)}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : stage === 'running' && currentQuestion ? (
        /* Active Quiz Runner */
        <section
          className={`max-w-3xl mx-auto rounded-3xl border p-5 sm:p-8 space-y-6 ${
            animEnabled ? 'transition-all duration-200' : ''
          }`}
          style={{
            backgroundColor: 'var(--site-surface)',
            borderColor: 'var(--site-border)',
            boxShadow: 'var(--site-shadow)',
          }}
        >
          {/* Progress Header */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium" style={{color: 'var(--site-text-muted)'}}>
                {isRetryWrongRun ? 'Работа над ошибками · ' : ''}
                {TYPE_LABELS[currentQuestion.type]} · {currentQuestion.chapterTitle}
              </span>
              <span className="font-mono-num font-semibold">
                Вопрос {currentIdx + 1} / {questions.length}
              </span>
            </div>
            <div
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{backgroundColor: 'var(--site-surface-alt)'}}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.round(((currentIdx + (submittedCurrent ? 1 : 0)) / questions.length) * 100)}%`,
                  backgroundColor: 'var(--site-accent)',
                }}
              />
            </div>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <h2 className="font-display text-xl sm:text-2xl font-semibold leading-snug whitespace-pre-line">
              {currentQuestion.prompt}
            </h2>
            {!submittedCurrent && currentQuestion.hintText && (
              <p className="text-xs italic" style={{color: 'var(--site-text-muted)'}}>
                {currentQuestion.hintText}
              </p>
            )}
          </div>

          {/* Question Controls (strictly NO answer revealed before submit) */}
          {(currentQuestion.type === 'single_choice' ||
            currentQuestion.type === 'true_false' ||
            currentQuestion.type === 'character_guess' ||
            currentQuestion.type === 'detail_event') && (
            <div className="space-y-2">
              {(currentQuestion.options || []).map((opt, idx) => {
                const chosen = draftSingle === idx;
                const isRightOption = currentQuestion.correctSingleIndex === idx;
                let borderCol = chosen ? 'var(--site-accent)' : 'var(--site-border)';
                let bgCol = chosen ? 'var(--site-surface-alt)' : 'var(--site-bg)';
                if (submittedCurrent) {
                  if (isRightOption) {
                    borderCol = '#15803d';
                    bgCol = 'rgba(21, 128, 61, 0.1)';
                  } else if (chosen && !isRightOption) {
                    borderCol = '#be123c';
                    bgCol = 'rgba(190, 18, 60, 0.1)';
                  }
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={submittedCurrent}
                    onClick={() => setDraftSingle(idx)}
                    className="w-full text-left px-4 py-3 rounded-2xl border text-sm flex items-center gap-3 transition-colors"
                    style={{borderColor: borderCol, backgroundColor: bgCol}}
                  >
                    <span
                      className="w-5 h-5 rounded-full border flex items-center justify-center text-[11px] font-mono-num shrink-0"
                      style={{
                        borderColor: chosen ? 'var(--site-accent)' : 'var(--site-border)',
                        backgroundColor: chosen ? 'var(--site-accent)' : 'transparent',
                        color: chosen ? 'var(--site-accent-contrast)' : 'inherit',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'multi_choice' && (
            <div className="space-y-2">
              {(currentQuestion.options || []).map((opt, idx) => {
                const chosen = draftMulti.includes(idx);
                const shouldBeChosen = (currentQuestion.correctMultiIndices || []).includes(idx);
                let borderCol = chosen ? 'var(--site-accent)' : 'var(--site-border)';
                let bgCol = chosen ? 'var(--site-surface-alt)' : 'var(--site-bg)';
                if (submittedCurrent) {
                  if (shouldBeChosen) {
                    borderCol = '#15803d';
                    bgCol = 'rgba(21, 128, 61, 0.1)';
                  } else if (chosen && !shouldBeChosen) {
                    borderCol = '#be123c';
                    bgCol = 'rgba(190, 18, 60, 0.1)';
                  }
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={submittedCurrent}
                    onClick={() =>
                      setDraftMulti((prev) =>
                        prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
                      )
                    }
                    className="w-full text-left px-4 py-3 rounded-2xl border text-sm flex items-start gap-3 transition-colors"
                    style={{borderColor: borderCol, backgroundColor: bgCol}}
                  >
                    <input
                      type="checkbox"
                      checked={chosen}
                      readOnly
                      className="mt-1 accent-[var(--site-accent)] pointer-events-none"
                    />
                    <span className="leading-relaxed">{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'text_input' && (
            <div className="space-y-2">
              <input
                type="text"
                disabled={submittedCurrent}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmitCurrent) {
                    e.preventDefault();
                    handleSubmitAnswer();
                  }
                }}
                placeholder="Введите ваш ответ..."
                className="w-full rounded-2xl border px-4 py-3 text-base outline-none"
                style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
              />
            </div>
          )}

          {currentQuestion.type === 'sequence' && (
            <div className="space-y-2">
              {draftSequence.map((item, idx) => (
                <div
                  key={`${idx}_${item.slice(0, 18)}`}
                  className="rounded-2xl border p-3.5 flex items-center justify-between gap-3"
                  style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="font-mono-num text-xs font-semibold opacity-65 mt-0.5 shrink-0">
                      {idx + 1}.
                    </span>
                    <p className="text-sm leading-relaxed">{item}</p>
                  </div>
                  {!submittedCurrent && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveSeqItem(idx, -1)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg border disabled:opacity-30"
                        style={{borderColor: 'var(--site-border)'}}
                        title="Выше"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSeqItem(idx, 1)}
                        disabled={idx === draftSequence.length - 1}
                        className="p-1.5 rounded-lg border disabled:opacity-30"
                        style={{borderColor: 'var(--site-border)'}}
                        title="Ниже"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Post-Submission Explanation */}
          {submittedCurrent && answers[currentQuestion.id] && (
            <div
              className="rounded-2xl border p-4 space-y-2"
              style={{
                backgroundColor: answers[currentQuestion.id].isCorrect
                  ? 'rgba(21, 128, 61, 0.08)'
                  : 'rgba(190, 18, 60, 0.08)',
                borderColor: answers[currentQuestion.id].isCorrect ? '#15803d' : '#be123c',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm flex items-center gap-2">
                  {answers[currentQuestion.id].isCorrect ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Верно!
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-600" /> Не совсем так
                    </>
                  )}
                </p>
                <button
                  onClick={() => openBookInReader(selectedBook.id, currentQuestion.pageIndex)}
                  className="text-xs font-medium inline-flex items-center gap-1 underline"
                  style={{color: 'var(--site-accent)'}}
                >
                  <BookOpen className="w-3.5 h-3.5" /> Стр. {currentQuestion.pageIndex + 1}
                </button>
              </div>
              {!answers[currentQuestion.id].isCorrect && (
                <p className="text-xs font-medium">
                  Правильный ответ: {getCorrectDisplay(currentQuestion)}
                </p>
              )}
              <p className="text-xs leading-relaxed opacity-90">{currentQuestion.explanation}</p>
            </div>
          )}

          {/* Footer Action */}
          <div className="flex items-center justify-end pt-2">
            {!submittedCurrent ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={!canSubmitCurrent}
                className="px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-45 whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: 'var(--site-accent)',
                  color: 'var(--site-accent-contrast)',
                }}
              >
                Ответить
              </button>
            ) : (
              <button
                onClick={handleNextOrFinish}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: 'var(--site-accent)',
                  color: 'var(--site-accent-contrast)',
                }}
              >
                {currentIdx + 1 < questions.length ? 'Следующий вопрос' : 'Завершить и посмотреть итог'}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>
      ) : (
        /* Summary Screen */
        lastSavedAttempt && (
          <section
            className="max-w-3xl mx-auto rounded-3xl border p-6 sm:p-8 space-y-6"
            style={{
              backgroundColor: 'var(--site-surface)',
              borderColor: 'var(--site-border)',
              boxShadow: 'var(--site-shadow)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b" style={{borderColor: 'var(--site-border)'}}>
              <div className="space-y-1">
                <p className="text-xs font-medium" style={{color: 'var(--site-text-muted)'}}>
                  {lastSavedAttempt.bookTitle} · {DIFFICULTY_LABELS[lastSavedAttempt.difficulty]}
                </p>
                <h2 className="font-display text-3xl font-semibold">
                  Результат теста: {lastSavedAttempt.scorePercent}%
                </h2>
                <p className="text-xs" style={{color: 'var(--site-text-muted)'}}>
                  Верных ответов: {lastSavedAttempt.correctCount} · Ошибок:{' '}
                  {lastSavedAttempt.wrongQuestionIds.length} · Всего вопросов:{' '}
                  {lastSavedAttempt.totalQuestions}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {lastSavedAttempt.wrongQuestionIds.length > 0 && (
                  <button
                    onClick={() =>
                      startRetryWrongQuestions(
                        lastSavedAttempt.questions,
                        lastSavedAttempt.wrongQuestionIds
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-medium whitespace-nowrap shrink-0"
                    style={{borderColor: 'var(--site-accent)', color: 'var(--site-accent)'}}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Повторить только ошибки
                  </button>
                )}
                <button
                  onClick={() => startNewQuiz(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor: 'var(--site-accent)',
                    color: 'var(--site-accent-contrast)',
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Новые вопросы
                </button>
              </div>
            </div>

            {lastSavedAttempt.wrongQuestionIds.length === 0 ? (
              <div
                className="rounded-2xl border p-6 text-center space-y-2"
                style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
              >
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
                <p className="font-display text-2xl font-semibold">Безупречная память!</p>
                <p className="text-xs" style={{color: 'var(--site-text-muted)'}}>
                  Вы ответили верно на все вопросы этого раунда.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-display text-xl font-semibold">
                  Вопросы с ошибками ({lastSavedAttempt.wrongQuestionIds.length})
                </h3>
                {lastSavedAttempt.questions
                  .filter((q) => lastSavedAttempt.wrongQuestionIds.includes(q.id))
                  .map((q) => {
                    const ans = lastSavedAttempt.answers[q.id];
                    return (
                      <div
                        key={q.id}
                        className="rounded-2xl border p-4 space-y-2"
                        style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold whitespace-pre-line">{q.prompt}</p>
                          <button
                            onClick={() => openBookInReader(selectedBook.id, q.pageIndex)}
                            className="text-xs underline shrink-0 whitespace-nowrap"
                            style={{color: 'var(--site-accent)'}}
                          >
                            Стр. {q.pageIndex + 1}
                          </button>
                        </div>
                        <p className="text-xs text-rose-600">
                          Ваш ответ: {ans?.userAnswerDisplay || '—'}
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                          Верный ответ: {getCorrectDisplay(q)}
                        </p>
                        <p className="text-xs" style={{color: 'var(--site-text-muted)'}}>
                          {q.explanation}
                        </p>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        )
      )}
    </div>
  );
};
