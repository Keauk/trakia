# D-022: Accept харесвам next to обичам when the translation says "like"

Status: done (2026-10-25) · Created: 2026-10-25 · Area: data and brief (`data/sentences.json`: `bg_alt`, `bg_alt_en`; `tools/SENTENCE_BRIEF.md`)

## Context
The learner typed *Харесвам …* for an English prompt "I like …" and it was marked wrong, because
the Bulgarian said *Обичам …*. English "like" (and Dutch "houden van" for tastes) does not tell
*обичам* from *харесвам*, so the prompt cannot ask for one of them.

Of the 40 sentences with *обичам*, 19 translate it as "like", and only one (M025) accepted a
*харесвам* form. The two verbs are not always interchangeable:
- For a general taste (food, drink, weather: *Обичам чай*, *Не обичам боб*) both are natural.
- For an activity, *обичам да …* pairs with *харесва ми да …*; *харесвам да …* is a calque that
  careful speakers avoid.
- *Обичам* for a person or with English "love" is "love"; *харесвам* is weaker ("like").
- *Харесвам* for one specific thing (*харесвам тази рокля*) is not *обичам*, which would say
  "love". Plants and animals *обичат* light or heat; *харесват* sounds wrong there.

## Proposal
1. In the 17 "like" sentences with *обичам* that lack it, accept the *харесвам* counterpart of every
   listed Bulgarian answer: the personal verb for a taste (*Харесвам чай. А ти?*, *Жена ми не
   харесва сирене.*), and *харесва ми да …* for an activity (*Вечер ми харесва да лежа във
   ваната.*). Each goes in the same list as the answer it mirrors (`bg_alt`, or `bg_alt_en` for the
   other ти/вие form, D-018).
2. No change for "love" sentences, for *харесвам* sentences about a specific thing, or for W031
   (*Това растение не обича жега*).
3. The writing brief says when to list the other verb.

Not proposed: accepting *харесвам да …*, or *обичам* for *харесвам*.

## Design notes
- One `tools/apply_patches.py` patch, written by hand: every new answer is spelled out and read
  before it is applied. Clitics follow the usual rules (*Не ми харесва да …*, *Вечер ми харесва да
  …*, *– Харесва ми да …* after a dialogue dash, *На бебето му харесва да …*).
- After applying: `tools/build_data.py`, `node tools/find_combinations.js --ids …` for the
  changed sentences, `npm test`.

## Acceptance criteria
- *Харесвам чай. А ти?* is correct for M078, *Не харесвам кафе с мляко.* for A048, *Вечер ми
  харесва да лежа във ваната.* for V109.
- *Харесвам да спортувам* is not accepted for W048, and *Харесвам те много* is wrong for A146.
- No existing answer removed; `npm test` and `python3 tools/check_decisions.py` pass.

## Effort and risks
Small: about 40 new answers in 17 sentences, plus one paragraph in the brief. Risk: a learner who
types *харесвам* for a taste never practises *обичам*. That is acceptable, since both are correct
and the expected line still shows *обичам*.

## As built
- 31 answers added to 17 sentences (M019, M078, A147, A048, M008, A181, B157, P029, Q061, C075,
  D067 with the personal verb; C101, E007, T067, U013, V109, W048 with *харесва ми да*); 23 in
  `bg_alt`, 8 in `bg_alt_en`. Nothing removed, no other field changed. The brief has a
  *обичам / харесвам* item. Cache version `trakia-v34`.
- `find_combinations.js` on the 17 sentences lists no new Bulgarian mixtures.

### Decisions taken
- *Харесвам да спортувам* scores *almost*, not *wrong*: it is three letters from *Харесва ми да*,
  inside the typo tolerance. It is not accepted, and the expected line shows *Харесва ми да*, so
  this was left as it is.

## Open questions
None.
