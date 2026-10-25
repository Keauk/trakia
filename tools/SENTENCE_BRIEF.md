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
3. Write the Dutch translation in natural, modern Standard Dutch (Netherlands), not a word-for-word gloss,
   but faithful (D-017): where natural Dutch allows it, keep the Bulgarian's number, definiteness,
   person, tense and structure. The same holds for the English primary. Idiomatic renderings go
   in the looser tier below.
4. Give alternative accepted answers in BOTH directions:
   - `nl_alt`: other fully correct Dutch translations of the Bulgarian sentence (different tense
     rendering, word order, synonym, "je/jij", "ik heb gekocht"/"ik kocht", etc.). 1-3 items, only
     ones a careful teacher would accept. Not just punctuation/case variants (the app normalises those).
   - `bg_alt`: other fully correct Bulgarian renderings of the Dutch sentence (pronoun dropped vs
     kept: "Аз съм учител" / "Учител съм"; word-order variants; "във/със" forms, etc.). 0-3 items.
     Only include bg_alt items that also respect constraint 1.
   - `en_alt`: other fully correct English translations, by the same rule as `nl_alt`.
   - `bg_alt_en` (D-018): Bulgarian answers accepted only for the English prompt. English "you" does
     not tell ти from вие, so when the Bulgarian addresses someone in the 2nd person and the English
     primary leaves it open, give the other form here, for `bg` and every `bg_alt` ("Имате ли
     момче или момиче?" → "Имаш ли момче или момиче?"; "Ела!" → "Елате!"). Polite or plural вие
     takes plural agreement ("Уморени ли сте?"). Leave it out when the English decides ("children",
     "you two", "madam", "Are you students?").
   - Gender (D-018): when neither the Dutch nor the English shows the gender of "I" or of a single
     "you", put the other-gender Bulgarian in `bg_alt` ("Не съм сигурна" → "Не съм сигурен").
   - **Combinations (D-020).** The app only accepts whole listed sentences. When two choices are
     independent, list every combination: "Aan het eind van de week" / "Eind van de week" with
     "platteland" / "dorp" gives four answers, not two. `node tools/find_combinations.js --ids
     <ids>` lists the mixtures that are still missing. Add only the ones that are good sentences:
     a mixture can lose a verb particle or mix ти and вие.
   - **обичам / харесвам (D-022).** When the Bulgarian uses *обичам* for a general taste and the
     translation says "like" (Dutch "houden van", "graag"), also list the *харесвам* form of every
     Bulgarian answer: *Обичам чай* → *Харесвам чай*, and for an activity *Обичам да чета* →
     *Харесва ми да чета* (never *харесвам да*). Not for "love", for people, for plants or
     animals, or the other way round for *харесвам* about one specific thing.
   - **Exact vs looser vs wrong (D-014, made stricter by D-017).** Judge every alternative against
     the Bulgarian, not against the primary. The test: a teacher marking a translation exercise.
     *Exact* (`nl_alt`, `en_alt`): full marks with no comment. That covers what the target language
     forces (articles, subject pronouns, word order, possessives for body parts, reported-speech
     backshift), equivalent tenses (present simple / continuous for the Bulgarian present; English
     past simple, Dutch imperfect or perfect for an aorist; will / going to for ще), dictionary
     synonyms of the same Bulgarian word, British/American pairs, contractions, and every reading of
     a genuinely ambiguous Bulgarian sentence ("в неделя" = "on Sunday" and "on Sundays").
     *Looser* (`nl_loose`, `en_loose`): right, but the teacher would add a note. Drift in number
     ("look you in the eye" for "в очите"), definiteness, person, voice, politeness ("I'd like" for
     "искам"), structure ("look into your eyes" for "те гледам в очите"), a word that translates
     another Bulgarian word ("dad" for "баща"), an idiom instead of the plain words ("stand a
     chance"), small additions or omissions, or tense (an English present perfect for an aorist).
     The app accepts these with a "≈ looser" note and shows the exact answer. Leave out anything
     that adds, drops or changes meaning ("freeze to death" for "замръзнем", "take" for "нося", "a
     cold" for "хрема").
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
  "en_alt": ["I bought milk and bread."],
  "en_loose": ["I've bought bread and milk."],
  "lemmas": ["купувам", "хляб", "и", "мляко"],
  "tags": ["food", "past"]
}
Write the file in chunks (append 50 at a time to a temp file, then assemble) if that helps you keep
quality high; the final file must be a single JSON array. Validate it parses with
`python3 -I -c "import json,sys; d=json.load(open(sys.argv[1])); print(len(d))" <file>` before you finish.
Your final reply: the number of sentences written and the path. Nothing else.
