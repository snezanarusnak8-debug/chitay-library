import {
  Book,
  BookContent,
  BookJournal,
  QuizDifficulty,
  QuizQuestion,
} from '../types/library';

export interface GenerateQuizOptions {
  book: Book;
  content: BookContent;
  journal?: BookJournal;
  chapterIds: string[];
  difficulty: QuizDifficulty;
  count: number;
  spoilerFree: boolean;
  excludeSignatures: Set<string>;
}

interface ExtractedSentence {
  text: string;
  chapterId: string;
  chapterTitle: string;
  pageIndex: number;
  orderIndex: number;
  words: string[];
  entities: string[];
}

const STOP_WORDS = new Set([
  'когда', 'чтобы', 'потому', 'только', 'очень', 'более', 'менее', 'между', 'через', 'после',
  'перед', 'около', 'почти', 'всегда', 'иногда', 'никогда', 'здесь', 'туда', 'откуда', 'почему',
  'который', 'которая', 'которое', 'которые', 'такой', 'такая', 'такое', 'такие', 'свой', 'своя',
  'этого', 'этому', 'этом', 'была', 'было', 'были', 'будет', 'будут', 'может', 'могут', 'один',
  'одна', 'одно', 'словно', 'будто', 'даже', 'если', 'хотя', 'либо', 'также', 'что-то', 'кто-то',
  'глава', 'часть', 'страница', 'этого', 'того', 'своей', 'своих', 'этой', 'этих', 'них', 'него',
  'неё', 'себя', 'себе', 'собой', 'надо', 'нужно', 'можно', 'нельзя', 'вдруг', 'потом', 'теперь',
]);

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function hashSignature(str: string): string {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `qsig_${(h >>> 0).toString(36)}`;
}

export function normalizeAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isTextAnswerMatch(userInput: string, acceptable: string[]): boolean {
  const normUser = normalizeAnswer(userInput);
  if (!normUser) return false;
  for (const acc of acceptable) {
    const normAcc = normalizeAnswer(acc);
    if (!normAcc) continue;
    if (normUser === normAcc) return true;
    // Allow close Russian case endings (root match if >= 5 chars)
    if (normUser.length >= 5 && normAcc.length >= 5) {
      const prefixLen = Math.min(normUser.length, normAcc.length) - 1;
      if (prefixLen >= 4 && normUser.slice(0, prefixLen) === normAcc.slice(0, prefixLen)) {
        return true;
      }
    }
  }
  return false;
}

export function getBookMaxReadPage(book: Book): number {
  if (book.status === 'finished') return Math.max(0, book.totalPages - 1);
  return Math.max(book.currentPage || 0, book.maxPageReached || 0, ...(book.bookmarks || [0]));
}

function extractSentencesFromContent(
  book: Book,
  content: BookContent,
  chapterIds: string[],
  spoilerFree: boolean
): ExtractedSentence[] {
  const maxPage = spoilerFree ? getBookMaxReadPage(book) : Math.max(0, content.pages.length - 1);
  const selectedChapterSet = new Set(chapterIds);

  const allowedPages = content.pages.filter((p) => {
    if (spoilerFree && p.index > maxPage) return false;
    if (selectedChapterSet.size > 0 && !selectedChapterSet.has(p.chapterId)) return false;
    return p.paragraphs.length > 0 && !p.paragraphs[0].startsWith('[Изображение');
  });

  const sentences: ExtractedSentence[] = [];
  let orderCounter = 0;

  for (const page of allowedPages) {
    for (const para of page.paragraphs) {
      const split = para
        .split(/(?<=[.!?…])\s+(?=[А-ЯЁA-Z«—])/u)
        .map((s) => s.trim())
        .filter((s) => s.length >= 42 && s.length <= 280);

      for (const s of split) {
        const rawWords = s.match(/[\p{L}\p{N}-]{3,}/gu) || [];
        const meaningfulWords = rawWords.filter(
          (w) => w.length >= 5 && !STOP_WORDS.has(w.toLowerCase())
        );

        // Find mid-sentence capitalized proper nouns or named roles
        const entities: string[] = [];
        const nonInitial = s.slice(1);
        const capMatches = nonInitial.match(/\b[А-ЯЁA-Z][\p{Ll}]{2,}(?:\s+[А-ЯЁA-Z][\p{Ll}]{2,})?/gu) || [];
        for (const m of capMatches) {
          if (!STOP_WORDS.has(m.toLowerCase())) entities.push(m);
        }

        sentences.push({
          text: s,
          chapterId: page.chapterId,
          chapterTitle: page.chapterTitle,
          pageIndex: page.index,
          orderIndex: orderCounter++,
          words: meaningfulWords,
          entities,
        });
      }
    }
  }

  return sentences;
}

function extractJournalCharacters(journal?: BookJournal): string[] {
  if (!journal) return [];
  const raw = `${journal.favoriteCharacters || ''}, ${journal.dislikedCharacters || ''}`;
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 40);
}

export function generateBookQuiz(options: GenerateQuizOptions): QuizQuestion[] {
  const {book, content, journal, chapterIds, difficulty, count, spoilerFree, excludeSignatures} =
    options;

  const sentences = extractSentencesFromContent(book, content, chapterIds, spoilerFree);
  if (sentences.length === 0) {
    return [];
  }

  // Vocabulary & Entity pools from the allowed text
  const wordCounts = new Map<string, number>();
  const entityCounts = new Map<string, number>();
  const allChapters = Array.from(
    new Map(sentences.map((s) => [s.chapterId, s.chapterTitle])).entries()
  );

  for (const s of sentences) {
    for (const w of s.words) {
      const low = w.toLowerCase();
      wordCounts.set(low, (wordCounts.get(low) || 0) + 1);
    }
    for (const e of s.entities) {
      entityCounts.set(e, (entityCounts.get(e) || 0) + 1);
    }
  }

  const journalChars = extractJournalCharacters(journal);
  for (const jc of journalChars) {
    entityCounts.set(jc, (entityCounts.get(jc) || 0) + 3);
  }

  const topEntities = Array.from(entityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  const wordPool = Array.from(wordCounts.keys()).filter((w) => w.length >= 5);

  const candidates: QuizQuestion[] = [];
  const usedLocalSigs = new Set<string>();

  const scoreNovelty = (sig: string) => (excludeSignatures.has(sig) ? 1 : 0);

  // Order sentences preferring unseen ones
  const sortedSentences = shuffle(sentences).sort(
    (a, b) => scoreNovelty(hashSignature(a.text)) - scoreNovelty(hashSignature(b.text))
  );

  let qIdCounter = 0;
  const nextId = () => `qz_${Date.now()}_${++qIdCounter}`;

  const pickKeyword = (s: ExtractedSentence): string | null => {
    const valid = s.words.filter((w) => w.length >= (difficulty === 'hard' ? 6 : 5));
    if (valid.length === 0) return null;
    // Prefer middle/end words so context before blank is clear
    const weighted = valid.slice(Math.floor(valid.length * 0.25));
    const pool = weighted.length > 0 ? weighted : valid;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // 1. Character Guess / Named Entity questions
  for (const s of sortedSentences) {
    const matchedEntity =
      s.entities.find((e) => topEntities.includes(e)) ||
      journalChars.find((jc) => s.text.toLowerCase().includes(jc.toLowerCase()));

    if (matchedEntity && topEntities.length >= 3) {
      const sig = hashSignature(`char_${s.text}`);
      if (usedLocalSigs.has(sig)) continue;
      const distractors = shuffle(
        topEntities.filter((e) => e.toLowerCase() !== matchedEntity.toLowerCase())
      ).slice(0, 3);
      if (distractors.length >= 2) {
        const masked = s.text.replace(matchedEntity, '_____');
        if (masked !== s.text) {
          const opts = shuffle([matchedEntity, ...distractors]);
          usedLocalSigs.add(sig);
          candidates.push({
            id: nextId(),
            signature: sig,
            type: 'character_guess',
            prompt: `О ком или о чём идёт речь в этом фрагменте (${s.chapterTitle})?\n«${masked}»`,
            chapterId: s.chapterId,
            chapterTitle: s.chapterTitle,
            pageIndex: s.pageIndex,
            options: opts,
            correctSingleIndex: opts.indexOf(matchedEntity),
            explanation: `В оригинале (стр. ${s.pageIndex + 1}, ${s.chapterTitle}) указано «${matchedEntity}»: «${s.text}»`,
            sourceQuote: s.text,
          });
        }
      }
    }
    if (candidates.length >= count * 2) break;
  }

  // 2. Single Choice (fill missing meaningful detail with plausible distractors)
  for (const s of sortedSentences) {
    const kw = pickKeyword(s);
    if (!kw) continue;
    const sig = hashSignature(`single_${s.text}`);
    if (usedLocalSigs.has(sig)) continue;

    const distractors = shuffle(
      wordPool.filter((w) => w !== kw.toLowerCase() && Math.abs(w.length - kw.length) <= 4)
    ).slice(0, 3);
    if (distractors.length < 3) continue;

    const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const masked = s.text.replace(regex, '_____');
    if (masked === s.text) continue;

    const formattedDistractors = distractors.map((d) =>
      kw[0] === kw[0].toUpperCase() ? d[0].toUpperCase() + d.slice(1) : d
    );
    const opts = shuffle([kw, ...formattedDistractors]);
    usedLocalSigs.add(sig);
    candidates.push({
      id: nextId(),
      signature: sig,
      type: 'single_choice',
      prompt: `Какое слово пропущено в этом отрывке из главы «${s.chapterTitle}»?\n«${masked}»`,
      chapterId: s.chapterId,
      chapterTitle: s.chapterTitle,
      pageIndex: s.pageIndex,
      options: opts,
      correctSingleIndex: opts.indexOf(kw),
      explanation: `Верный вариант — «${kw}». Полный фрагмент (стр. ${s.pageIndex + 1}): «${s.text}»`,
      sourceQuote: s.text,
    });
    if (candidates.length >= count * 3) break;
  }

  // 3. Detail / Event -> Which chapter did this happen in? (if >= 2 chapters)
  if (allChapters.length >= 2) {
    for (const s of sortedSentences) {
      const sig = hashSignature(`chap_${s.text}`);
      if (usedLocalSigs.has(sig)) continue;
      const otherChapters = shuffle(
        allChapters.filter(([id]) => id !== s.chapterId).map(([, title]) => title)
      ).slice(0, 3);
      if (otherChapters.length === 0) continue;
      const opts = shuffle([s.chapterTitle, ...otherChapters]);
      usedLocalSigs.add(sig);
      candidates.push({
        id: nextId(),
        signature: sig,
        type: 'detail_event',
        prompt: `В какой главе происходит этот момент?\n«${s.text}»`,
        chapterId: s.chapterId,
        chapterTitle: s.chapterTitle,
        pageIndex: s.pageIndex,
        options: opts,
        correctSingleIndex: opts.indexOf(s.chapterTitle),
        explanation: `Этот эпизод находится в разделе «${s.chapterTitle}» на странице ${s.pageIndex + 1}.`,
        sourceQuote: s.text,
      });
      if (candidates.length >= count * 4) break;
    }
  }

  // 4. True / False statements
  for (let i = 0; i < sortedSentences.length; i++) {
    const s = sortedSentences[i];
    const sig = hashSignature(`tf_${s.text}`);
    if (usedLocalSigs.has(sig)) continue;

    const makeTrue = i % 2 === 0;
    if (makeTrue) {
      usedLocalSigs.add(sig);
      candidates.push({
        id: nextId(),
        signature: sig,
        type: 'true_false',
        prompt: `Правда или ложь? Следующее событие действительно описывается в прочитанных главах:\n«${s.text}»`,
        chapterId: s.chapterId,
        chapterTitle: s.chapterTitle,
        pageIndex: s.pageIndex,
        options: ['Правда', 'Ложь'],
        correctSingleIndex: 0,
        explanation: `Правда — этот эпизод действительно встречается в «${s.chapterTitle}» (стр. ${s.pageIndex + 1}).`,
        sourceQuote: s.text,
      });
    } else {
      const kw = pickKeyword(s);
      const swap = kw
        ? shuffle(wordPool.filter((w) => w !== kw.toLowerCase() && w.length >= 5))[0]
        : null;
      if (!kw || !swap) continue;
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const altered = s.text.replace(regex, swap);
      if (altered === s.text) continue;
      usedLocalSigs.add(sig);
      candidates.push({
        id: nextId(),
        signature: sig,
        type: 'true_false',
        prompt: `Правда или ложь? В тексте книги встречается именно такая формулировка:\n«${altered}»`,
        chapterId: s.chapterId,
        chapterTitle: s.chapterTitle,
        pageIndex: s.pageIndex,
        options: ['Правда', 'Ложь'],
        correctSingleIndex: 1,
        explanation: `Ложь — в оригинале (стр. ${s.pageIndex + 1}, ${s.chapterTitle}) вместо «${swap}» было «${kw}»: «${s.text}»`,
        sourceQuote: s.text,
      });
    }
    if (candidates.length >= count * 5) break;
  }

  // 5. Multiple choice (Select all true fragments from the book)
  for (let i = 0; i + 3 < sortedSentences.length; i += 4) {
    const s1 = sortedSentences[i];
    const s2 = sortedSentences[i + 1];
    const s3 = sortedSentences[i + 2];
    const sig = hashSignature(`multi_${s1.text}_${s2.text}`);
    if (usedLocalSigs.has(sig)) continue;

    const kw = pickKeyword(s3);
    const swap = kw ? shuffle(wordPool.filter((w) => w !== kw.toLowerCase()))[0] : null;
    if (!kw || !swap) continue;
    const falseStmt = s3.text.replace(
      new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
      swap
    );
    if (falseStmt === s3.text) continue;

    const tagged = shuffle([
      {text: s1.text, ok: true},
      {text: s2.text, ok: true},
      {text: falseStmt, ok: false},
    ]);
    usedLocalSigs.add(sig);
    candidates.push({
      id: nextId(),
      signature: sig,
      type: 'multi_choice',
      prompt: 'Выберите ВСЕ фрагменты, которые действительно встречаются в выбранных главах (без изменений):',
      chapterId: s1.chapterId,
      chapterTitle: s1.chapterTitle,
      pageIndex: s1.pageIndex,
      options: tagged.map((t) => t.text),
      correctMultiIndices: tagged
        .map((t, idx) => (t.ok ? idx : -1))
        .filter((idx) => idx !== -1),
      explanation: `Первые два достоверных отрывка взяты напрямую из текста («${s1.chapterTitle}», «${s2.chapterTitle}»), а в изменённом варианте слово «${kw}» заменено на «${swap}».`,
      sourceQuote: s1.text,
    });
    if (candidates.length >= count * 6) break;
  }

  // 6. Text Input (Recall missing key word/name)
  for (const s of sortedSentences) {
    const kw = pickKeyword(s);
    if (!kw || kw.length < 5) continue;
    const sig = hashSignature(`input_${s.text}`);
    if (usedLocalSigs.has(sig)) continue;
    const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const masked = s.text.replace(regex, '_____');
    if (masked === s.text) continue;

    usedLocalSigs.add(sig);
    const hint =
      difficulty === 'easy'
        ? `Подсказка: начинается на «${kw[0].toUpperCase()}», длина ${kw.length} букв`
        : difficulty === 'medium'
        ? `Подсказка: первая буква — «${kw[0].toUpperCase()}»`
        : undefined;

    candidates.push({
      id: nextId(),
      signature: sig,
      type: 'text_input',
      prompt: `Впишите пропущенное слово или имя (${s.chapterTitle}):\n«${masked}»`,
      chapterId: s.chapterId,
      chapterTitle: s.chapterTitle,
      pageIndex: s.pageIndex,
      acceptableAnswers: [kw],
      hintText: hint,
      explanation: `Пропущенное слово — «${kw}». Цитата со страницы ${s.pageIndex + 1}: «${s.text}»`,
      sourceQuote: s.text,
    });
    if (candidates.length >= count * 7) break;
  }

  // 7. Sequence / Chronological Order
  const chronological = [...sentences].sort((a, b) => a.orderIndex - b.orderIndex);
  const seqSize = difficulty === 'hard' ? 4 : 3;
  if (chronological.length >= seqSize * 2) {
    const step = Math.max(1, Math.floor(chronological.length / (seqSize + 1)));
    for (let start = 0; start + step * (seqSize - 1) < chronological.length; start += Math.max(2, step)) {
      const picked: ExtractedSentence[] = [];
      for (let k = 0; k < seqSize; k++) {
        picked.push(chronological[start + k * step]);
      }
      const correctOrder = picked.map(
        (p) => `${p.text.slice(0, 125)}${p.text.length > 125 ? '…' : ''}`
      );
      if (new Set(correctOrder).size < seqSize) continue;
      const sig = hashSignature(`seq_${correctOrder.join('|')}`);
      if (usedLocalSigs.has(sig)) continue;

      let shuffledSeq = shuffle(correctOrder);
      if (shuffledSeq.every((item, idx) => item === correctOrder[idx]) && shuffledSeq.length > 1) {
        shuffledSeq = [shuffledSeq[1], shuffledSeq[0], ...shuffledSeq.slice(2)];
      }

      usedLocalSigs.add(sig);
      candidates.push({
        id: nextId(),
        signature: sig,
        type: 'sequence',
        prompt: 'Восстановите правильную хронологическую последовательность событий (сверху вниз — от более раннего к более позднему):',
        chapterId: picked[0].chapterId,
        chapterTitle: picked[0].chapterTitle,
        pageIndex: picked[0].pageIndex,
        sequenceItems: shuffledSeq,
        correctSequenceOrder: correctOrder,
        explanation: `Правильный порядок событий по ходу книги: ${correctOrder
          .map((c, idx) => `${idx + 1}) «${c.slice(0, 55)}…»`)
          .join(' → ')}`,
        sourceQuote: picked[0].text,
      });
      if (candidates.filter((c) => c.type === 'sequence').length >= 3) break;
    }
  }

  // Balance types & prioritize unseen signatures
  const byType = new Map<string, QuizQuestion[]>();
  for (const c of candidates) {
    const arr = byType.get(c.type) || [];
    arr.push(c);
    byType.set(c.type, arr);
  }
  byType.forEach((arr) => {
    arr.sort((a, b) => scoreNovelty(a.signature) - scoreNovelty(b.signature));
  });

  const typeOrder =
    difficulty === 'easy'
      ? ['single_choice', 'true_false', 'character_guess', 'detail_event', 'multi_choice', 'sequence', 'text_input']
      : difficulty === 'medium'
      ? ['single_choice', 'character_guess', 'multi_choice', 'true_false', 'sequence', 'text_input', 'detail_event']
      : ['text_input', 'sequence', 'multi_choice', 'character_guess', 'single_choice', 'detail_event', 'true_false'];

  const selected: QuizQuestion[] = [];
  let round = 0;
  while (selected.length < count && round < 20) {
    let addedInRound = false;
    for (const t of typeOrder) {
      if (selected.length >= count) break;
      const pool = byType.get(t);
      if (pool && pool[round]) {
        selected.push(pool[round]);
        addedInRound = true;
      }
    }
    if (!addedInRound) break;
    round += 1;
  }

  return shuffle(selected);
}
