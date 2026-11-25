export type EnglishEditorialPage = {
  label: string;
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
};

const CONTENT: Record<string, EnglishEditorialPage> = {
  "/": {
    label: "Using ZIKR as a learning companion",
    intro: "ZIKR brings Quran reading, Hadith, remembrance, learning resources, family-friendly activities and practical daily tools into one organized experience. Each section has a different purpose, so this guide explains how to navigate the library, verify sensitive information and build a routine that fits your own needs.",
    sections: [
      { heading: "Start with a clear purpose", paragraphs: ["Choose the task you came to complete: read a passage, find a narration, review a supplication, listen to a recitation or use a daily tool. A focused starting point makes the platform easier to navigate and keeps secondary features from distracting you.", "Use the section navigation, search and saved items to return to useful material. You can move between related subjects without treating every page as a separate destination."] },
      { heading: "Separate source material from explanation", paragraphs: ["A Quran verse, a Hadith quotation, an editorial summary and information supplied by an external service are not the same kind of material. ZIKR aims to distinguish the original source from commentary and practical guidance, so readers can see what is quoted and what is explanatory.", "When a question involves a detailed religious ruling or a disputed historical claim, use the linked source and consult a qualified specialist. A technology platform can organize information, but it should not present an automated summary as a fatwa."] },
      { heading: "Build a sustainable routine", paragraphs: ["A short, repeatable session is often more useful than an ambitious plan that is difficult to maintain. Choose a reading or listening goal, save your place when the feature supports it, and return for review rather than trying to complete everything in one visit.", "Use reminders and progress tools as optional aids. They should support attention and learning, not become a measure of personal worth or a substitute for understanding."] },
      { heading: "Help keep the library reliable", paragraphs: ["Check the reference attached to sensitive material before sharing it. For external audio and video, identify the original publisher and respect the source's usage terms; an embedded link does not make third-party content ZIKR-owned content.", "When a page contains an incorrect title, broken reference or unclear description, report the exact page and the place where the issue appears. A precise report helps the editorial team review the source and correct the record."] },
    ],
  },
  "/quran": {
    label: "Quran reading and understanding guide",
    intro: "The Quran is central to ZIKR, so the reading experience is designed to be more than a list of chapter and verse numbers. This guide explains how to move from recitation to contextual reading, how to use trusted tafsir resources and how to distinguish the Quranic text from human explanation or translation.",
    sections: [
      { heading: "Read verses within their passage", paragraphs: ["Begin with the complete passage rather than relying on an isolated verse or a cropped quotation. Read the surrounding verses, identify the chapter's broader subject and note how the passage connects to what comes before and after it. Context reduces the risk of drawing a conclusion from a fragment.", "A practical session can combine a short recitation, a careful reading and a note about a word or idea that needs review. Return to a trusted tafsir source when a meaning requires scholarly explanation instead of treating a personal impression as a formal interpretation."] },
      { heading: "Reflection and tafsir serve different purposes", paragraphs: ["Reflection encourages a reader to consider meaning and action; tafsir is a scholarly discipline with methods, sources and interpretive traditions. ZIKR separates the Quranic text from the explanatory material presented around it, and aims to identify the source of that explanation when available.", "If your question moves from general understanding to a specific legal ruling, consult a qualified scholar or recognized fatwa institution. A reader's reflection, an editorial note and a binding religious answer must not be presented as interchangeable."] },
      { heading: "References are part of content quality", paragraphs: ["For Quran-related material, identify the chapter and verse wherever practical. For tafsir or historical context, name the book, institution or reference work when the source is known. A link is a route for verification; it does not replace the original text or the complete scholarly discussion.", "Page length and view counts do not prove accuracy. Quality depends on correct text, context, transparent attribution and a useful path to the source. The goal is to help readers verify information, not to add words for the sake of search rankings."] },
      { heading: "A practical reading plan", paragraphs: ["Choose a chapter, read a manageable passage, listen to a recitation if helpful and open tafsir when a point needs explanation. Save a passage or note your stopping point when those tools are available, then return for review in a later session.", "Beginners may prefer shorter passages and a simple explanation; experienced readers may choose a longer plan that combines reading, tafsir and memorization. ZIKR does not impose one pace because time, prior knowledge and learning goals differ."] },
    ],
  },
  "/hadith": {
    label: "Hadith verification and responsible reading",
    intro: "The Hadith section is organized to help readers locate narrations and their sources while remembering that attribution matters. A narration may be classified as authentic, good, weak or fabricated, and different wordings or chains may receive different assessments. This guide offers a careful process before quoting or sharing a report.",
    sections: [
      { heading: "Verify the complete wording", paragraphs: ["Start with the full narration, not a shortened image or a sentence circulating without context. Search a recognized Hadith collection, compare the wording and identify the book and chapter where the report appears. A statement can have a sound meaning without being a Prophetic Hadith, and a genuine narration may circulate in an altered wording.", "Record the reference before sharing. When available, check the narrator, chain and grading, and make sure the source refers to the same wording you are quoting. Do not infer that a quote is authentic merely because it appears on many websites."] },
      { heading: "Keep the text separate from commentary", paragraphs: ["The transmitted wording should be distinguishable from the explanation added by an editor, translator or teacher. Translation can help readers understand a narration, but it is not the original Arabic wording and should not be presented as though it were.", "A useful page identifies what is quoted, what is translated and what is commentary. When a grading or explanation is attributed to a scholar, name the reference rather than turning an unattributed summary into a definitive judgment."] },
      { heading: "More narrations do not automatically mean better knowledge", paragraphs: ["A large collection is useful only when the reader can identify sources and navigate the material. Relevance, accurate attribution and clear classification are more important than the number of items displayed on a page.", "Avoid building a ruling from a single quotation without examining related narrations and scholarly context. For detailed authentication questions, consult specialists in Hadith studies and the original reference works."] },
      { heading: "Share with care", paragraphs: ["Before publishing a narration, copy its wording and reference carefully, check whether an explanation has been mixed into the quotation, and state a grading only when it can be traced to a reliable source.", "If a reference appears incomplete or a report seems incorrectly attributed, pause before sharing it and report the page for review. A correction supported by a precise source is more useful than a general claim that a narration is wrong."] },
    ],
  },
  "/adhkar": {
    label: "Daily adhkar and remembrance guide",
    intro: "The adhkar section helps readers organize established remembrances and return to them throughout the day. Digital tools can make a routine easier to follow, but they should serve the remembrance itself rather than turn worship into a screen-based activity.",
    sections: [
      { heading: "Build a repeatable morning and evening routine", paragraphs: ["Choose a suitable time and a manageable set of remembrances, then follow the wording and counts established by the relevant source. A stable routine is easier to maintain when it fits your daily schedule and leaves room for attention rather than rushing through a long list.", "When a narration specifies a time or count, keep that detail linked to its source. Do not add a repetition count or special virtue simply because it is convenient for an app interface."] },
      { heading: "Use technology as a quiet aid", paragraphs: ["A reminder, saved list or counter can help you return to a routine, but the phone should not become the focus of the act. Keep the screen simple, disable unnecessary notifications during remembrance and use the audio option only when it genuinely helps.", "Progress indicators are personal organization tools. They do not measure sincerity or spiritual worth, and missing a day should not prevent you from returning to a small, sustainable routine."] },
      { heading: "Distinguish the source from the explanation", paragraphs: ["Where possible, show the original Arabic wording, a clear reference and any translation or explanation as separate fields. This helps readers recognize which part is transmitted and which part is editorial guidance.", "For a remembrance whose source or wording is disputed, consult a recognized Hadith reference or qualified scholar. A short page summary should not replace the full scholarly discussion."] },
      { heading: "Connect remembrance with daily life", paragraphs: ["A useful routine can be connected to existing moments such as waking, leaving home or finishing a prayer. The aim is steady recall and attention, not completing a checklist as quickly as possible.", "Use saved items and reminders to reduce friction, then let the tool step out of the way. If a digital feature distracts you, the simplest option—remembering without the device—remains available."] },
    ],
  },
  "/dua": {
    label: "Supplication, meaning and source guide",
    intro: "The supplications library organizes prayers from the Quran and established sources, with room for context and explanation. This guide helps readers understand the wording, distinguish transmitted supplications from personal prayers and verify references before sharing material.",
    sections: [
      { heading: "Understand the types of supplication", paragraphs: ["The library may include supplications from the Quran, narrations from the Sunnah and general personal prayers. These categories should be labeled clearly because a personal prayer must not be attributed to the Prophet or presented as a transmitted text without evidence.", "When a supplication is linked to a particular occasion, verify that the occasion and wording are supported by the cited source. A category label or popular usage does not establish religious attribution."] },
      { heading: "Read the meaning before repeating the words", paragraphs: ["A translation can clarify the meaning for readers who do not understand Arabic, but it remains a translation rather than the original wording. Keep the Arabic text, translation and explanatory notes visually distinct.", "When a phrase is unfamiliar, review its context and source instead of relying on an unreferenced explanation. This is especially important when a page makes claims about guaranteed outcomes, special virtues or prescribed repetition counts."] },
      { heading: "Respect privacy in personal prayers", paragraphs: ["Personal supplications may reflect private concerns. A reader should not need to publish sensitive personal details to save a prayer or use a general reminder feature.", "Keep personal notes private and avoid entering financial, medical or other sensitive information into a public field. A useful supplication tool can work without collecting unnecessary personal data."] },
      { heading: "Verify references before sharing", paragraphs: ["For Quranic supplications, include the chapter and verse. For narrations, identify the collection and reference and avoid stating a grading unless it has been checked against a reliable source.", "If a source is unavailable, say so clearly. It is better to label a reference as unverified than to invent a book, narrator or attribution to make a page look complete."] },
    ],
  },
  "/prophets": {
    label: "Stories of the Prophets and Quranic context",
    intro: "The Prophets section presents material rooted in the Quran and established sources. A responsible account distinguishes what is stated in revelation, what is found in transmitted reports and what later historians describe as an approximate or disputed detail.",
    sections: [
      { heading: "Begin with the Quranic account", paragraphs: ["Use the Quranic passage as the starting point for the Prophet's story, then read the surrounding verses to understand its purpose and context. The order of stories in the Quran may serve a thematic purpose rather than a modern chronological timeline.", "When a page links to a verse, keep the chapter and verse reference visible. Commentary should be clearly identified as commentary and should never be blended into the sacred text."] },
      { heading: "Separate established details from historical estimates", paragraphs: ["Some details are stated clearly in the Quran or sound reports, while other details come from historical narration or later literature. Dates, locations and chronological sequences may therefore have different levels of certainty.", "Use qualified language when a point is disputed or approximate. Do not turn a popular story, a speculative date or a later illustration into a definitive religious fact."] },
      { heading: "Make the story accessible to younger readers", paragraphs: ["For children and younger learners, divide the narrative into short episodes with simple language and a clear learning objective. Questions can encourage reflection without inventing dialogue or events that are not supported by sources.", "Illustrations and activities should reinforce the lesson while respecting the limits of what can be represented. Parents and educators can help children distinguish a sourced account from a simplified explanation."] },
      { heading: "Continue with reliable reading", paragraphs: ["Readers who want more detail can open recognized tafsir works, Hadith references and historical studies. A short overview is an introduction, not a replacement for the source material.", "Where scholars differ over a report, preserve that distinction and provide a route to further reading. Clear source labels help both new readers and advanced students."] },
    ],
  },
  "/companions": {
    label: "The Companions: biography and historical reading",
    intro: "Biographical pages about the Companions need careful attribution and historical context. This guide introduces a way to read the available reports without turning a person into a flawless legend or treating every historical account as equally certain.",
    sections: [
      { heading: "Read a biography through its sources", paragraphs: ["Look at the person's role, known events, relationships and the references supporting each account. Distinguish Quranic references, Hadith reports and later biographical or historical works, because they do not all carry the same evidentiary weight.", "A concise page can help the reader understand why a person is significant, but it should direct deeper questions to the underlying books and scholarly studies."] },
      { heading: "Learn from role models without idealizing history", paragraphs: ["Biographical learning can highlight faith, courage, knowledge and service without pretending that historical figures lived outside human circumstances. Avoid unsupported claims and sweeping descriptions that flatten complex lives into slogans.", "When an account contains a sensitive or disputed detail, explain the uncertainty and identify the type of source being used. Respectful writing and careful historical method can coexist."] },
      { heading: "Handle differences between reports", paragraphs: ["Historical sources may differ in dates, names, sequences and details. Compare the reports where possible and avoid presenting a single version as certain when the evidence does not justify that level of confidence.", "If a claim is disputed among historians or scholars, state that the accounts differ and provide references for further examination. Do not use a popular retelling as the sole proof."] },
      { heading: "Turn biography into practical learning", paragraphs: ["After reading, consider the values and decisions described, and ask what is transferable to ordinary life today. Avoid extracting a modern political conclusion from an event without understanding its original context.", "The page should work as a gateway to sources and related biographies, helping readers explore a connected historical library rather than memorizing isolated anecdotes."] },
    ],
  },
  "/scholars": {
    label: "Scholars, works and methods of learning",
    intro: "A scholar's biography should be grounded in reliable biographical sources and the person's actual writings. This section helps readers understand a scholar's period, fields of study and major works without attributing every later opinion or quotation to that individual.",
    sections: [
      { heading: "Understand the scholarly biography first", paragraphs: ["Before sharing a quotation, identify the scholar's period, teachers, students, areas of specialization and the works reliably attributed to them. That context helps prevent short extracts from being used in ways the author may not have intended.", "When a biographical detail is uncertain, label it as such and avoid filling gaps with confident-sounding speculation."] },
      { heading: "The original book is the wider reference", paragraphs: ["A biographical summary is an introduction. The author's book allows readers to inspect the chapter, argument, terminology and qualifications that may be missing from a short quotation.", "Distinguish an original work from a later commentary, abridgment or modern study. If an edition or translation is used, identify it when that information is available."] },
      { heading: "Scholarly disagreement is part of learning", paragraphs: ["Differences between scholars do not automatically mean that a source is unreliable. Explain the subject of disagreement, identify the relevant schools or methods and avoid presenting one summary as though it resolves every question.", "For specialized religious questions, return to recognized scholarship and qualified teachers. A profile page should map the literature, not act as a substitute for a scholarly lesson."] },
      { heading: "Use this section as a study map", paragraphs: ["Start with the scholar's main field, select a representative work and follow the references to a fuller source. Related names and subjects can help you build a reading sequence rather than collecting quotations without context.", "For academic work, record the edition, volume and page of the passage you use. A precise reference is more useful than a copied excerpt with no bibliographic detail."] },
    ],
  },
  "/articles": {
    label: "Original articles and editorial standards",
    intro: "The articles library is intended to provide useful, original material with a clear purpose and a transparent relationship to its sources. This guide explains what makes an article valuable and why originality, structure and references matter more than adding pages for their own sake.",
    sections: [
      { heading: "A useful article answers a real question", paragraphs: ["A strong article identifies the subject, explains why it matters and gives the reader a clear route through the main points. A long introduction that repeats generic statements adds little value if it does not help the reader understand the topic.", "Use headings to organize ideas, examples to explain difficult points and a concise conclusion to summarize what the reader should take away. The content should remain connected to the article's title and search intent."] },
      { heading: "Originality matters more than page count", paragraphs: ["Original work contributes analysis, synthesis, explanation or a useful resource. Rewording several existing pages without adding verification or context does not create a meaningful new article.", "Avoid adding invented quotations, statistics or religious claims to make a page appear comprehensive. When a detail cannot be verified, qualify it or leave it out."] },
      { heading: "Sources and transparency", paragraphs: ["Cite the reference behind a factual or religious claim when the source is available. Separate a quotation from the writer's explanation, and identify external material that has been embedded or adapted.", "References should help readers check the information. A list of links is not enough if none of the links supports the claims made in the article."] },
      { heading: "Plan a connected editorial library", paragraphs: ["Related articles should link to relevant topics, original source pages and practical tools when those destinations genuinely help the reader. Internal links should clarify the subject journey, not merely increase page views.", "Review older articles when sources, dates or platform features change. A maintained library is more useful than a large archive of unattended pages."] },
    ],
  },
  "/stories": {
    label: "Stories, narrative structure and source discipline",
    intro: "Storytelling can make complex subjects easier to follow, but a compelling narrative must not invent events or disguise uncertainty. This guide sets out how ZIKR can present stories with a clear structure, careful historical language and appropriate material for younger readers.",
    sections: [
      { heading: "Build a narrative without inventing events", paragraphs: ["A well-structured story introduces its setting, explains the central question and guides the reader through events in a clear sequence. Dialogue, motives and scene details should not be fabricated and then presented as historical fact.", "When a narrative uses a simplified retelling, identify it as a retelling and preserve the source's meaning. Do not add dramatic details merely to make the story more entertaining."] },
      { heading: "Historical writing needs precise language", paragraphs: ["Distinguish what a source explicitly reports from what a modern writer infers. Dates, places, names and causal explanations may be uncertain, especially when sources were written long after the event.", "Use phrases such as 'the report states' or 'some historians place the event' when that best reflects the evidence. Precise uncertainty is better than false certainty."] },
      { heading: "Adapt stories for younger readers", paragraphs: ["A children's version can use shorter sentences, explain unfamiliar terms and divide the material into episodes. The core facts and source boundaries must remain intact even when the language becomes simpler.", "Add a question, activity or reflection that reinforces the learning objective. Avoid frightening imagery, unsafe challenges or invented religious details."] },
      { heading: "Learning continues after the story", paragraphs: ["A story page should link to the relevant biography, Quran passage, Hadith reference or historical overview so readers can explore the original material.", "Invite readers to consider what is established, what needs further verification and what can be learned from the account. This makes storytelling an entry point to study rather than an end in itself."] },
    ],
  },
  "/tafsir": {
    label: "Tafsir: context, sources and responsible study",
    intro: "Tafsir is a scholarly discipline, not a personal guess about the meaning of a verse. This guide explains how to approach the Quranic text, compare recognized explanations and use digital tools without confusing automated summaries with scholarship.",
    sections: [
      { heading: "Start with the verse and its context", paragraphs: ["Read the verse within its passage and chapter before looking at a short explanation. The surrounding text, subject and relevant context may change how a phrase should be understood.", "Identify whether a page is displaying the Quranic text, a translation, a paraphrase or an excerpt from a tafsir work. These materials have different purposes and should not be visually merged."] },
      { heading: "Recognize that tafsir works may differ", paragraphs: ["Tafsir books can use different methods and emphasize language, transmitted reports, jurisprudence or broader themes. A difference in presentation does not by itself establish that one summary is wrong.", "When comparing explanations, record the book and passage and look at the reasoning in context. Do not quote one line as the entire position of a commentator."] },
      { heading: "Know the limits of automated tools", paragraphs: ["Search and AI tools can help locate topics, explain vocabulary or organize a reading list. They can also omit context, produce inaccurate wording or attribute an explanation to the wrong source.", "Never treat an automated answer as a verified tafsir or fatwa. Confirm the Arabic text, reference and scholarly explanation through the original material."] },
      { heading: "Create a manageable study plan", paragraphs: ["Choose a passage, read its context, compare one or more recognized explanations and note the questions that remain. A small, repeatable plan supports deeper learning better than skimming many unrelated summaries.", "For advanced study, use a qualified teacher or a recognized curriculum. ZIKR's digital resources are navigation aids and introductions, not a replacement for structured scholarship."] },
    ],
  },
  "/battles": {
    label: "The battles: documented historical reading",
    intro: "Accounts of early battles require careful historical context and source comparison. This guide separates the event itself from later moral, political or military interpretation, and explains why numbers, chronology and quotations should be treated with care.",
    sections: [
      { heading: "Context comes before the event", paragraphs: ["Begin with the political, social and geographic circumstances that preceded the event. Identifying the people, locations and sequence of developments helps explain the choices available at the time.", "Do not assume that a short account captures every motive or perspective. Use the original reference and compare later studies when the subject is disputed."] },
      { heading: "Treat dates and numbers carefully", paragraphs: ["Casualty figures, troop sizes, dates and distances can vary between historical reports. State the source and qualify the figure when the evidence is not uniform.", "Avoid repeating a precise number simply because it appears in a popular infographic. An exact-looking figure is not necessarily a well-supported figure."] },
      { heading: "Distinguish Quranic text from historical narrative", paragraphs: ["A Quranic passage may refer to a battle or its lessons, while a historical source may describe chronology and named participants. Keep those kinds of evidence separate and explain how they relate.", "Do not claim that a later historical detail is part of the Quranic text. The verse, the transmitted report and the historian's reconstruction should remain clearly identified."] },
      { heading: "What readers should take away", paragraphs: ["A useful historical page helps readers identify the event, its setting, the available sources and the points that remain uncertain. It should not reduce a complex event to a slogan or use it as a shortcut to modern political claims.", "Follow the references for a deeper study and compare the chronology with related biographies and events. The goal is informed reading, not memorizing an unsupported summary."] },
    ],
  },
  "/conquests": {
    label: "Conquests and historical change",
    intro: "The history of conquests spans different regions, periods and political settings. A careful account needs a clear timeline, geographic context and transparent sourcing, while distinguishing historical description from religious or political judgments that may vary between writers.",
    sections: [
      { heading: "Build a timeline before drawing conclusions", paragraphs: ["Organize the events chronologically and identify the major locations, leaders and preceding developments. This makes it easier to understand how one change affected the next.", "Use modern place names alongside historical names when helpful, and qualify a geographic identification when the location is not certain."] },
      { heading: "Use historical sources, not popular retellings alone", paragraphs: ["Compare recognized historical works and modern studies, and distinguish an original account from a later summary. A popular story can be a starting point for research, but it should not be the only evidence for an important claim.", "Where sources disagree about dates, numbers or quotations, state that the reports differ rather than selecting the most dramatic version."] },
      { heading: "Separate description from judgment", paragraphs: ["A historical page can explain what happened without turning every description into a modern political or legal conclusion. Religious evaluation has its own sources and methods and should not be smuggled into a historical summary.", "Make it clear when an assessment belongs to a particular historian or school of thought. Readers should be able to identify fact, interpretation and opinion."] },
      { heading: "Move from an overview to deeper study", paragraphs: ["Connect the event to biographies, geographic references and primary or specialist studies. A short page should guide the reader toward the material needed for more detailed research.", "This approach turns the conquests section into a connected historical library rather than a list of disconnected place names and dates."] },
    ],
  },
  "/mushaf": {
    label: "Digital Mushaf and reading experience",
    intro: "A digital Mushaf is a reading experience first and an interface second. The design should make it easy to reach a chapter or verse, read comfortably, listen when desired and resume a previous session without distracting from the Quranic text.",
    sections: [
      { heading: "Readable text on every screen", paragraphs: ["Font size, line spacing, contrast and a calm reading surface make a real difference during longer sessions. Keep motion and decorative controls away from the text area so the reader can focus on the verses.", "Navigation between chapters and pages should remain clear on both phones and larger screens. Progress saving should be treated as a convenience, not as a guarantee that every device will preserve the same local state."] },
      { heading: "Listening should support reading", paragraphs: ["Audio recitation can help with following a passage or reviewing memorization, especially when the active verse is easy to identify. It remains optional and should never block access to the written text.", "Keep audio providers separate from the Quran text source. A temporary audio outage should not make the core reading experience unavailable."] },
      { heading: "Connect reading with memorization", paragraphs: ["Memorization requires repetition, recall and review rather than a single play-through. The Mushaf can work alongside progress tools and recitation controls when those features are available.", "Save a personal review point without sharing unnecessary private information. The reader should remain in control of the pace and the amount of tracking used."] },
      { heading: "Preserve the original text accurately", paragraphs: ["The Quranic text must not be treated as ordinary editorial copy that can be casually rewritten. Its source and rendering require careful verification and stable display tests.", "Any tafsir or translation should be labeled as a separate layer of material. That distinction helps readers understand what is the Arabic source text and what is explanatory support."] },
    ],
  },
  "/reciters": {
    label: "Quran reciters and audio guide",
    intro: "The reciters directory should help users choose audio that supports reading and memorization. It is more than a list of names: a useful page organizes access to chapters, explains the listening controls and keeps the recitation source distinct from the Quranic text.",
    sections: [
      { heading: "Choose a reciter for your purpose", paragraphs: ["Preferences differ. Some listeners prefer a slower pace for review, while others choose a reciter for a particular sound or style. The interface should make browsing and comparison easy without claiming that one choice is religiously or educationally mandatory.", "When profile details are shown, prefer an official or trusted source. Do not fill a missing biography with repeated descriptions copied from unknown pages."] },
      { heading: "Make audio part of learning", paragraphs: ["Listeners can follow the text, repeat a passage or use audio for revision. Controls for play, pause, chapter selection and repetition should be clear, and the player should not obscure the text.", "Keep the written Quran available when an external audio service is down. A provider failure should not block the main reading task."] },
      { heading: "Respect audio rights and attribution", paragraphs: ["Audio files may have usage terms that differ from the public availability of Quranic text. Use providers that permit the intended access and identify the original source where practical.", "Never assume that a file may be re-hosted or redistributed just because it can be streamed from a public website. Follow the provider's conditions and the rights holder's terms."] },
      { heading: "Listen actively when it helps", paragraphs: ["A focused session can include choosing a chapter, following the text, pausing to review and repeating a short passage. That makes the player a practical learning aid rather than background audio alone.", "Listening is one part of study. Correct recitation, memorization and detailed instruction may also require a qualified teacher and deliberate review."] },
    ],
  },
  "/kids": {
    label: "Kids: safe learning and family guidance",
    intro: "Children's content should combine real educational value with a simple and safe experience. This guide explains how stories, games and short activities can support learning while limiting unnecessary personal data and giving parents a clear view of what the section offers.",
    sections: [
      { heading: "Teach in small, clear steps", paragraphs: ["Children often engage better with a short story, one activity and a simple review question than with a long lesson. Divide material into manageable steps and make it easy to return without losing the main learning goal.", "A game should reinforce a real skill or idea rather than become screen time with no educational purpose. Explain the goal and make the interaction predictable and age-appropriate."] },
      { heading: "Safety and privacy come first", paragraphs: ["A learning activity does not need a child's full name, photograph or sensitive details to be useful. Keep data collection limited and explain any personal feature that stores progress.", "Do not encourage children to share private information or move to services that are not suitable for their age. Parents should be able to understand the data and safety boundaries of the activity."] },
      { heading: "Parents and caregivers are partners", paragraphs: ["Parents can help select the right age range, discuss a story and turn a short activity into a conversation. The best result is shared understanding, not simply completing a score or level.", "Use progress information as a learning aid, not as pressure. Children develop at different rates and should be encouraged through supportive guidance."] },
      { heading: "Present religious material carefully", paragraphs: ["Children's religious content should be based on reliable sources and explained in clear language. A simplified story must not invent a religious statement, dialogue or event and then attribute it to a source.", "When material needs a detailed explanation, provide a route for parents and educators to review the source. Accuracy remains important even when the vocabulary is simple."] },
    ],
  },
  "/poetry": {
    label: "Poetry and Arabic literature",
    intro: "Poetry can enrich language and reflection, but literary material needs attribution and respect for copyright. This guide explains how to present poems, distinguish original work from quotation and help readers explore the text without confusing literary interpretation with religious evidence.",
    sections: [
      { heading: "Keep literary interpretation in its proper place", paragraphs: ["Poetry may express emotion, imagery or historical experience. A literary reading can discuss language and theme, but it should not be presented as a religious proof or a factual historical report without independent evidence.", "When a poem touches religious themes, identify the difference between poetic expression and a transmitted Quranic or Hadith text."] },
      { heading: "Respect authorship and usage rights", paragraphs: ["Identify the poet and edition when known, and check whether the poem is public domain or permitted for display. Modern poems and recordings may remain protected even when short excerpts circulate online.", "Embedding or quoting material under a permitted use is different from re-uploading a complete work. Follow the rights holder's terms and identify the original source."] },
      { heading: "Read the text as literature", paragraphs: ["Help readers notice vocabulary, rhythm, imagery and the relationship between lines. A short introduction can explain the poem's setting and literary context without pretending to settle every interpretation.", "Where an attribution is uncertain, say so. Avoid assigning anonymous verses to a famous poet just because the style appears similar."] },
      { heading: "Organize a useful literary library", paragraphs: ["Group poems by theme, period or poet where the information is verified. Link biographies and reference works when they improve understanding.", "The value of a poetry section comes from accurate attribution and thoughtful organization, not from copying the largest possible number of texts."] },
    ],
  },
  "/tawasheeh": {
    label: "Tawasheeh and audio listening",
    intro: "Audio devotional and cultural material needs clear attribution, good playback and careful rights handling. This guide explains how to present the text and recording together while making the publisher and source visible.",
    sections: [
      { heading: "Separate lyrics, audio and editorial notes", paragraphs: ["When a recording includes written words, show the source text separately from any editorial explanation. A transcription can contain mistakes and should not be treated as authoritative without review.", "Identify the performer or publisher when known. Do not present a third-party recording as an original ZIKR production unless that is accurate."] },
      { heading: "Verify the source and license", paragraphs: ["Audio recordings and written lyrics may have separate rights. Confirm that the provider permits the intended access and do not assume that a public streaming link grants permission to re-host the recording.", "Where licensing information is unavailable, avoid making a claim that the file is free to reuse. A transparent source label is better than an unsupported rights statement."] },
      { heading: "Keep listening quality reliable", paragraphs: ["A useful player should have clear controls, responsive playback and a visible fallback when the external provider is unavailable. Do not hide a broken stream behind a permanent loading state.", "Keep the recording optional and avoid autoplay that surprises the visitor. Users should decide when audio begins and stops."] },
      { heading: "Use audio as a learning resource", paragraphs: ["A short introduction can explain what the listener will hear and why the item is included. Where relevant, link to related literature or educational material.", "The page should add context and organization rather than merely reproducing a third-party catalog without explanation."] },
    ],
  },
  "/videos": {
    label: "Educational videos and responsible viewing",
    intro: "The video section should connect each recording to a subject, source and useful learning outcome. The page adds value through context and organization, not by treating a third-party video as an original ZIKR production.",
    sections: [
      { heading: "Place every video in context", paragraphs: ["Explain what the viewer will see, who the intended audience is and why the video belongs on the page. A short description helps people understand the material before they press play.", "Connect the video to related reading or references when those links genuinely help. Avoid generic descriptions that could apply to any video."] },
      { heading: "Verify the channel and original source", paragraphs: ["Identify the publishing channel and confirm that the title and video correspond to the source being linked. A channel name or thumbnail alone is not proof of accuracy.", "For religious or historical claims, compare important statements with the original text and recognized references before presenting the video as a learning source."] },
      { heading: "Respect copyright and platform rules", paragraphs: ["Embedding a video from its official player is different from downloading, re-uploading or storing the file. Follow the platform's terms and the creator's rights.", "Do not remove attribution or suggest that external content was produced by ZIKR. If a source is removed or permission changes, update the page rather than leaving a misleading player."] },
      { heading: "Turn viewing into learning", paragraphs: ["Invite viewers to note one key point, open the related reference and review the subject after watching. That helps transform passive viewing into a useful learning session.", "Keep comments, related links and recommendations relevant to the topic. The page should guide the visitor rather than distract them with unrelated media."] },
    ],
  },
  "/platform": {
    label: "About the platform and its editorial method",
    intro: "ZIKR is organized as a connected learning library with tools for reading, listening and daily practice. This guide explains the platform's structure, its approach to sources and the limits that should remain clear when using digital services.",
    sections: [
      { heading: "A connected library", paragraphs: ["Sections should link to related subjects when doing so helps the reader continue a task. Quran reading, Hadith references, biographies, articles and daily tools have different purposes but can form a coherent learning path.", "Navigation and internal links are designed to reduce friction. They should not obscure the original source or encourage users to open pages they do not need."] },
      { heading: "Sources come before presentation", paragraphs: ["For sensitive religious and historical information, the source is part of the content. The platform aims to distinguish quoted text, editorial explanation, translations and data from external services.", "When a source cannot be verified, the page should avoid a definitive claim. Clear limitations are more trustworthy than polished wording that hides uncertainty."] },
      { heading: "Daily tools should remain practical", paragraphs: ["Prayer times, Qibla, reminders and counters can support a routine, but their output depends on configuration and device behavior. Explain the relevant settings and avoid presenting a calculated result as a universal ruling.", "Users should be able to disable optional reminders and control the data they save. Convenience should not come at the cost of unnecessary collection or distraction."] },
      { heading: "Continuous review and correction", paragraphs: ["Content quality is maintained through source checks, clear ownership and reports from readers. A published page may still need correction when a reference, link or external service changes.", "Report an error with the page title, exact passage and a suggested source. A reviewable report helps the team reproduce and resolve the problem."] },
    ],
  },
  "/faq": {
    label: "Frequently asked questions and practical guidance",
    intro: "This extended guide explains common questions about ZIKR's role, its editorial approach and the way users should treat external content. It is designed to make the platform's limits and responsibilities clear before visitors rely on a feature.",
    sections: [
      { heading: "Is ZIKR a fatwa institution?", paragraphs: ["No. ZIKR organizes learning material, references and practical tools. It does not replace a qualified scholar or a recognized fatwa institution for personal or complex religious questions.", "Use the platform to locate a source or prepare a question, then consult a specialist when a ruling depends on personal circumstances or detailed jurisprudence."] },
      { heading: "Is every page intended for search indexing?", paragraphs: ["No. Some pages are functional screens, account tools or personalized views rather than independent editorial resources. Search visibility should follow the page's actual value and purpose.", "A useful public page should answer a real question, provide clear source context and avoid duplicating other pages solely to increase page count."] },
      { heading: "How is external content handled?", paragraphs: ["Third-party audio, video and references should identify their original publisher and follow the source's terms. An embedded player or outbound link does not mean ZIKR owns the material.", "When an external source changes or becomes unavailable, the page should explain that limitation instead of pretending the resource is still accessible."] },
      { heading: "How can a user report an error?", paragraphs: ["Send the page title, the exact location of the issue and a reliable reference if one is available. Include the expected correction where possible so the review can be reproduced.", "Avoid sending passwords, account numbers or other private data with a general content report. The editorial team needs the page and source, not unrelated personal information."] },
      { heading: "How should this library be used?", paragraphs: ["Choose a section, read the relevant source and use practical tools only when they support the task. Save a useful passage or return for review rather than trying to consume every feature at once.", "For advanced study, follow the references to original works and qualified instruction. The site is an organized starting point, not a replacement for specialist education."] },
    ],
  },
};

const PUBLIC_LABELS: Record<string, string> = {
  "/audio": "Audio and recitation guide",
  "/library": "Library and knowledge guide",
  "/knowledge": "Learning and verification guide",
  "/memorization": "Memorization and review guide",
  "/prayer-times": "Prayer times guide",
  "/qibla": "Qibla and location tools guide",
  "/tasbeeh": "Digital remembrance counter guide",
  "/wird": "Daily wird guide",
  "/about": "About ZIKR",
  "/contact": "Contact and error reporting",
};

const EXCLUDED = ["/admin", "/auth", "/api", "/profile", "/favorites", "/settings", "/data-deletion"];

export function getEnglishEditorialPage(pathname: string): EnglishEditorialPage | null {
  const normalized = pathname.split("?")[0].replace(/\/$/, "") || "/";
  if (EXCLUDED.some((prefix) => normalized === prefix || normalized.startsWith(prefix + "/"))) return null;
  const exact = CONTENT[normalized];
  if (exact) return exact;

  const label = PUBLIC_LABELS[normalized] ??
    (normalized.startsWith("/quran/") ? "Verse and chapter guide" :
      normalized.startsWith("/hadith/") ? "Hadith book and narration guide" :
        normalized.startsWith("/dua/") ? "Supplication and source guide" :
          normalized.startsWith("/prophets/") ? "Prophet biography and Quranic context" :
            normalized.startsWith("/companions/") ? "Companion biography and historical sources" :
              normalized.startsWith("/scholars/") ? "Scholar profile and bibliography" :
                normalized.startsWith("/articles/") ? "Article and references guide" :
                  normalized.startsWith("/stories/") ? "Story and source guide" :
                    normalized.startsWith("/videos/") ? "Video source and learning guide" :
                      normalized.startsWith("/kids/") ? "Children's learning guide" : null);
  if (!label) return null;

  return {
    label,
    intro: "This page is part of ZIKR's learning library. Its material is organized by purpose, with a clear distinction between original sources, editorial explanation and information supplied by changing external services. Use the guide below to understand the page, verify important claims and follow relevant references.",
    sections: [
      { heading: "How to use this page", paragraphs: ["Start with the main task presented on the page, then use search, categories or saved items to locate the right material. If the page contains an interactive tool, review its settings and choose only the options you need; good design should support learning rather than replace it.", "Return in short sessions when useful, review your last saved position and open a related section when it answers a real follow-up question. This makes the library useful in everyday practice instead of a collection of disconnected screens."] },
      { heading: "Sources and clear attribution", paragraphs: ["For religious and historical information, identify the source when it is available and distinguish quoted material from editorial explanation. Information supplied by an external service should be recognizable as such.", "When evidence is incomplete or sources disagree, use precise language and avoid turning an estimate into a confirmed fact. Open the full reference or consult a specialist when the question needs more detail."] },
      { heading: "A practical way to continue", paragraphs: ["Set a short reading or listening goal, save what needs review and return to the source before sharing a quotation. Educational material can be approached through its title, central idea, supporting reference and practical application.", "If you find an incorrect passage, link or category, report the page title and exact location of the issue through the contact page. A specific report makes editorial review faster and more reliable."] },
    ],
  };
}
