# Sentence-writing brief (Bulgarian <-> Dutch)

You are writing practice sentences for a Dutch speaker learning Bulgarian. The learner studies a
frequency word list in Anki in a fixed order ("rank" 1..2952). Sentences are later filtered by the
highest rank of the words they use, so the learner only sees sentences built from words already studied.

## Hard constraints
1. Use ONLY Bulgarian words whose dictionary form appears in the vocabulary file you were given
   (any inflected form is fine: plural, definite article -ът/-та/-то/-те, verb conjugations, past
   tense, imperatives, comparatives, short pronoun forms like ме/те/го/я/ни/ви/ги/ми/ти/му/ѝ/им).
   Function words that are not in the file but are unavoidable may be used sparingly: ли, не, да, ще,
   съм (всички форми: съм/си/е/сме/сте/са, бях/беше/бяхме/бяха), се/си (reflexive), по-/най-
   prefixes, numerals 1-20, proper names of people/cities (Иван, Мария, София, Пловдив, Амстердам).
   Do NOT use other content words outside the file.
2. Every sentence must be natural, idiomatic, correct modern Bulgarian with correct stress-free
   spelling, correct definite articles, correct aspect, and correct clitic placement (clitics never
   sentence-initial; "ли" after the questioned word).
3. Write the Dutch translation in natural, modern Standard Dutch (Netherlands), not a word-for-word gloss.
4. Give alternative accepted answers in BOTH directions:
   - `nl_alt`: other fully correct Dutch translations of the Bulgarian sentence (different tense
     rendering, word order, synonym, "je/jij", "ik heb gekocht"/"ik kocht", etc.). 1-3 items, only
     ones a careful teacher would accept. Not just punctuation/case variants (the app normalises those).
   - `bg_alt`: other fully correct Bulgarian renderings of the Dutch sentence (pronoun dropped vs
     kept: "Аз съм учител" / "Учител съм"; word-order variants; "във/със" forms, etc.). 0-3 items.
     Only include bg_alt items that also respect constraint 1.
5. `lemmas`: list the dictionary forms (exactly as spelled in column `bulgarian` of the vocabulary
   file) of EVERY content word you used from the file: nouns, verbs, adjectives, adverbs, pronouns,
   prepositions, conjunctions, numerals, particles. This is used to compute the sentence's rank, so be
   complete and exact (e.g. "ходя" not "ходи"; "хляб" not "хляба"; multiword entries like "Добре съм"
   exactly as listed). Do not list words from the "unavoidable function words" exception list.
6. Variety: mix statements, yes/no questions (with ли), wh-questions, negatives, imperatives/requests,
   present/past (aorist and imperfect where natural)/future (ще), modal (трябва/мога/искам), definite
   and indefinite nouns, singular and plural, 1st/2nd/3rd person, polite Вие, short dialogue lines.
   Length: 3-12 words; most 5-9 words. Topics: everyday life, food, family, work, travel, shopping,
   weather, time, feelings, home, health, city — spread evenly across the vocabulary you are given,
   and prefer words from the UPPER part of your rank range so that later sentences actually exercise
   newer words (but keep each sentence coherent).
7. No duplicates or near-duplicates. Do not reuse the same Bulgarian sentence skeleton more than 3 times.
8. `en`: a short English gloss (helps the learner, whose Anki deck is BG<->EN).

## Output
Write ONE file, valid JSON (UTF-8, no comments, no trailing commas), an array of objects:
{
  "id": "<BAND><3-digit number>",   e.g. "A001"
  "bg": "Купих хляб и мляко.",
  "nl": "Ik heb brood en melk gekocht.",
  "nl_alt": ["Ik kocht brood en melk."],
  "bg_alt": ["Аз купих хляб и мляко."],
  "en": "I bought bread and milk.",
  "lemmas": ["купувам", "хляб", "и", "мляко"],
  "tags": ["food", "past"]
}
Write the file in chunks (append 50 at a time to a temp file, then assemble) if that helps you keep
quality high; the final file must be a single JSON array. Validate it parses with
`python3 -I -c "import json,sys; d=json.load(open(sys.argv[1])); print(len(d))" <file>` before you finish.
Your final reply: the number of sentences written and the path. Nothing else.
