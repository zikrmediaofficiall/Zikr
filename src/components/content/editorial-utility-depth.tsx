import { Card } from '@/components/ui/card';
import type { Locale } from '@/lib/i18n';

const UTILITY_CONTENT: Record<string, {
  heading: string;
  intro: string;
  blocks: { title: string; text: string }[];
}> = {
  '/prayer-times': {
    heading: 'دليل مواقيت الصلاة واستخدام الأداة',
    intro: 'مواقيت الصلاة أداة تعتمد على الموقع الجغرافي وطريقة الحساب والمنطقة الزمنية، لذلك تعرض ذِكرٌ الصفحة بوصفها أداة مساعدة تحتاج إلى إعداد صحيح ومراجعة محلية عند الحاجة.',
    blocks: [
      { title: 'الموقع وطريقة الحساب', text: 'قد تختلف أوقات الصلاة بين المدن أو بين طرق الحساب بدقائق محدودة. يجب التأكد من المدينة والموقع والمنطقة الزمنية قبل الاعتماد على النتائج، خصوصًا عند السفر أو تغيير الجهاز.' },
      { title: 'الدقة وحدود الخدمة', text: 'النتيجة الرقمية لا تعني أن كل الحالات المحلية متطابقة. إذا كانت هناك تعليمات رسمية من مسجد أو جهة دينية محلية، يمكن للمستخدم مقارنتها مع التطبيق عند وجود فرق.' },
      { title: 'التذكيرات', text: 'الإشعارات وظيفة اختيارية تساعد على التذكر ولا تعني أن التطبيق يضمن سماع التنبيه في كل جهاز؛ إعدادات البطارية والمتصفح ونظام التشغيل قد تؤثر على التسليم.' },
      { title: 'المصدر والسياق', text: 'نوضح للمستخدم أن حساب الوقت يتم عبر خدمة تقنية، وأن التفاصيل الفقهية المتعلقة ببداية الوقت ونهايته يرجع فيها إلى أهل العلم والجهة المحلية المختصة.' },
    ],
  },
  '/qibla': {
    heading: 'دليل القبلة والموقع الجغرافي',
    intro: 'أداة القبلة تعتمد على اتجاه الموقع بالنسبة إلى الكعبة، وعلى أجهزة الاستشعار في الهاتف عندما تستخدم البوصلة الرقمية. لذلك نقدمها كأداة مساعدة وليست بديلًا عن معرفة الاتجاهات أو سؤال أهل المكان عند الحاجة.',
    blocks: [
      { title: 'دقة البوصلة', text: 'المغناطيسات وأغطية الهواتف والبيئة المحيطة قد تؤثر على البوصلة. عند وجود انحراف واضح يمكن معايرة الجهاز أو الابتعاد عن مصادر المجال المغناطيسي.' },
      { title: 'إذن الموقع', text: 'قد تحتاج الأداة إلى إذن الموقع لتحديد الاتجاه من مكانك. يمكن للمستخدم رفض الإذن، وفي هذه الحالة يمكن إدخال الموقع أو استخدام وسائل بديلة عند توفرها.' },
      { title: 'التحقق العملي', text: 'في مكان جديد يمكن مقارنة الاتجاه مع مسجد قريب أو تطبيق موثوق آخر، خصوصًا عندما تكون البوصلة غير مستقرة.' },
      { title: 'الجانب الشرعي', text: 'الأداة تساعد على الوصول إلى الاتجاه، أما الأحكام الفقهية المتعلقة باستقبال القبلة في حالات العجز أو السفر أو الخطأ فمرجعها المصادر الفقهية وأهل العلم.' },
    ],
  },
  '/tasbeeh': {
    heading: 'عداد التسبيح والذكر الرقمي',
    intro: 'عداد التسبيح أداة للعد والتنظيم، وليس شرطًا لصحة الذكر. وجود العداد في التطبيق يهدف إلى تقليل نسيان العدد وإتاحة تكرار مريح دون أن يجعل العبادة مرتبطة بالشاشة.',
    blocks: [
      { title: 'العد وسيلة لا غاية', text: 'يمكن للمستخدم الذكر باللسان والقلب دون هاتف. العداد خيار لمن يحتاج إلى وسيلة بصرية أو رقمية للمراجعة.' },
      { title: 'التكرار الصحيح', text: 'عند وجود عدد ثابت في نص مأثور، يُفضل اتباع النص والمصدر بدل اختيار رقم من واجهة التطبيق دون دليل.' },
      { title: 'التركيز', text: 'يستحسن ألا تتحول الشاشة إلى مصدر تشتيت؛ يمكن إيقاف الإشعارات أو استخدام وضع بسيط أثناء جلسة الذكر.' },
      { title: 'الخصوصية', text: 'العداد لا يحتاج إلى بيانات شخصية. وأي سجل شخصي للورد ينبغي أن يعامل كمعلومة خاصة يمكن للمستخدم حذفها أو عدم مشاركتها.' },
    ],
  },
  '/memorization': {
    heading: 'منهج حفظ القرآن والمراجعة',
    intro: 'الحفظ المستمر يحتاج إلى تكرار ومراجعة وقياس واقعي للتقدم. أدوات ذِكرٌ تساعد على تنظيم الخطة وتسجيل الجلسات، لكنها لا تستبدل تصحيح التلاوة على يد معلم مؤهل.',
    blocks: [
      { title: 'خطة قابلة للاستمرار', text: 'اختر مقدارًا يمكن تكراره أسبوعيًا، واجعل المراجعة جزءًا من الخطة منذ اليوم الأول. الإفراط في الجديد مع ترك القديم يؤدي غالبًا إلى ضعف التثبيت.' },
      { title: 'التسميع', text: 'الاختبار الحقيقي للحفظ هو استدعاء النص دون النظر. يمكن استخدام تسجيل صوتي أو التسميع أمام معلم أو شخص موثوق، مع مراجعة الأخطاء.' },
      { title: 'المسافات بين المراجعات', text: 'توزيع المراجعة على أيام متعددة يساعد على تذكر النص أكثر من جلسة واحدة طويلة، ويمكن تعديل الخطة وفق القدرة والوقت.' },
      { title: 'التعامل مع الخطأ', text: 'الخطأ في الحفظ يحتاج إلى تصحيح هادئ ومباشر. عند وجود التباس في ضبط آية أو قراءة، يعود المستخدم إلى المصحف والمصدر الصوتي والمعلم.' },
    ],
  },
  '/wird': {
    heading: 'الورد اليومي وبناء عادة روحانية',
    intro: 'الورد اليومي هو نظام شخصي للقراءة والذكر والدعاء. أفضل خطة هي التي يمكن الحفاظ عليها في الأيام العادية وفي فترات الانشغال، مع مساحة للمراجعة بدل الشعور بالفشل عند انقطاع يوم.',
    blocks: [
      { title: 'ابدأ بحد أدنى', text: 'حدد جزءًا صغيرًا واضحًا يمكن إنجازه حتى في اليوم المزدحم، ثم أضف إليه عند توفر الوقت.' },
      { title: 'سجل التقدم دون ضغط', text: 'السجل أداة للمراجعة وليس حكمًا على الإيمان. استخدمه لمعرفة النمط: متى تقرأ؟ ما الذي يعيقك؟ وما الوقت الأنسب لك؟' },
      { title: 'اربط العبادة بالسياق', text: 'يمكن ربط الورد بالصلاة أو بوقت ثابت في الصباح والمساء، مع الاحتفاظ بمرونة عند السفر أو المرض أو تغير العمل.' },
      { title: 'العودة بعد الانقطاع', text: 'عند توقف الخطة، الأفضل العودة بخطوة صغيرة بدل محاولة تعويض كل شيء في جلسة واحدة. الاستمرارية أهم من الشعور بالذنب.' },
    ],
  },
  '/zakat': {
    heading: 'معلومات تمهيدية عن الزكاة',
    intro: 'صفحة الزكاة تقدم وعيًا عامًا وتنظيمًا للمعلومات، لكنها لا تصدر حسابًا فقهيًا ملزمًا لكل شخص؛ لأن الحكم قد يختلف باختلاف نوع المال والملكية والنصاب والحول والديون وغيرها من التفاصيل.',
    blocks: [
      { title: 'جمع البيانات أولًا', text: 'قبل أي حساب، صنّف الأموال وحدد ما تملكه فعليًا، وما هو مشترك أو دين أو أمانة، وسجل التواريخ اللازمة عند الحاجة.' },
      { title: 'الاختلاف الفقهي', text: 'بعض مسائل الزكاة في الأسهم أو التجارة أو الديون لها تفاصيل وخلافات معتبرة، لذلك لا يصح اختزالها في رقم آلي واحد دون معرفة الحالة.' },
      { title: 'المرجع المتخصص', text: 'عند حساب مبلغ ملزم، استخدم جهة إفتاء أو عالمًا مؤهلًا يعرف حالك، وقدم له بيانات مرتبة بدل الاعتماد على منشور مجهول.' },
      { title: 'الخصوصية', text: 'لا تدخل أرقام الحسابات أو أرقام البطاقات أو أي بيانات مالية حساسة في حقل عام. التنظيم لا يحتاج إلى كشف تفاصيلك المالية للآخرين.' },
    ],
  },
  '/spiritual-ai': {
    heading: 'الذكاء الاصطناعي الروحاني: كيف نستخدمه بمسؤولية؟',
    intro: 'الرفيق الروحاني أداة للبحث والتلخيص وتوجيه المستخدم إلى المصادر، وليس عالمًا أو جهة إفتاء. الإجابات الآلية قد تخطئ في النقل أو الفهم أو نسبة الأقوال، لذلك صُممت التجربة لتشجع على الرجوع إلى المصدر.',
    blocks: [
      { title: 'الجواب ليس مصدرًا', text: 'عندما يعطي النظام شرحًا أو ملخصًا، افتح المصدر المرتبط به وتأكد من النص والسياق، خصوصًا في الآيات والأحاديث والأحكام.' },
      { title: 'الأسئلة الشرعية', text: 'السؤال عن حكم شخصي أو حالة فقهية دقيقة يحتاج إلى متخصص. يمكن استخدام الأداة لصياغة السؤال أو العثور على المصطلحات، لا لاستبدال الفتوى.' },
      { title: 'الهلوسة والنسبة', text: 'قد ينتج النموذج اقتباسًا غير دقيق أو ينسب كلامًا إلى عالم. لا تنشر الإجابة كما هي دون تحقق مستقل.' },
      { title: 'الخصوصية', text: 'تجنب إدخال أسرار شخصية أو بيانات حساسة في أي خدمة ذكاء اصطناعي لمجرد طلب نصيحة عامة، وراجع سياسة الخصوصية قبل استخدام ميزات تخزين أو مزامنة.' },
    ],
  },
  '/radio': {
    heading: 'إذاعة القرآن والاستماع المستمر',
    intro: 'الإذاعة خدمة استماع يمكن أن تجعل تلاوة القرآن جزءًا من اليوم، لكنها تعتمد على مصدر بث خارجي وقد تتأثر بالشبكة أو بحالة الخدمة. لذلك نحافظ على بدائل القراءة داخل الموقع.',
    blocks: [
      { title: 'البث مقابل القراءة', text: 'الاستماع مناسب أثناء القيادة أو العمل المسموح به، بينما القراءة والتدبر يحتاجان إلى وقت وانتباه مختلفين. لا تجعل البث المستمر هو الوسيلة الوحيدة للتعلم.' },
      { title: 'المصدر الخارجي', text: 'المحتوى الصوتي قد يأتي من جهة أخرى، وهذه الجهة مسؤولة عن البث وشروط الاستخدام. نعرضها بوضوح ولا ندعي ملكية مواد الطرف الثالث.' },
      { title: 'الأداء', text: 'يمكن إيقاف البث عند ضعف الاتصال، مع استخدام المصحف أو الملفات المتاحة محليًا عندما تكون الخدمة الخارجية غير مستقرة.' },
      { title: 'الهدوء الرقمي', text: 'نفضل مشغلًا بسيطًا لا يطغى على المحتوى ولا يفتح نوافذ غير ضرورية أثناء الاستماع.' },
    ],
  },
  '/youtube': {
    heading: 'قناة يوتيوب ومحتوى الفيديو الخارجي',
    intro: 'قسم يوتيوب يربط المحتوى المرئي بالموضوعات داخل ذِكرٌ. القيمة المضافة يجب أن تكون في التنظيم والوصف والسياق، لا في نسخ فيديوهات الغير وإعادة تقديمها كأنها إنتاج المنصة.',
    blocks: [
      { title: 'مقدمة لكل فيديو', text: 'اكتب للمستخدم ما الذي سيشاهده ولماذا هو مفيد وما علاقته بالصفحة، حتى تكون الصفحة مفهومة قبل تشغيل الفيديو.' },
      { title: 'المصدر', text: 'وضّح القناة أو الجهة المنتجة، وتجنب نسب الفيديو للمنصة إذا لم تكن هي المنتج.' },
      { title: 'حقوق النشر', text: 'التضمين من يوتيوب شيء، وإعادة رفع الفيديو أو تخزينه شيء آخر. نحترم شروط الخدمة وحقوق أصحاب المحتوى.' },
      { title: 'المشاهدة النقدية', text: 'خصوصًا في المواد الدينية، قارن ادعاءات الفيديو بالمصادر الأصلية قبل اعتمادها أو إعادة نشرها.' },
    ],
  },
  '/search': {
    heading: 'البحث في مكتبة ذِكرٌ',
    intro: 'البحث أداة وصول إلى المحتوى وليست صفحة تحريرية بحد ذاتها. نحافظ على فائدة نتائج البحث من خلال أسماء واضحة ومحتوى مرتبط بالاستعلام، ونتجنب اعتبار كل استعلام صفحة يجب فهرستها.',
    blocks: [
      { title: 'اكتب كلمة محددة', text: 'استخدام اسم السورة أو الصحابي أو موضوع المقال يعطي نتائج أكثر دقة من عبارة طويلة جدًا.' },
      { title: 'افتح المصدر', text: 'نتيجة البحث مجرد بوابة. عند الوصول إلى حديث أو مادة تاريخية، راجع الصفحة الأصلية والمراجع.' },
      { title: 'صفحات الاستعلام ليست محتوى مستقلًا', text: 'الموقع يعامل نتائج البحث كشاشة وظيفية؛ لا نملأها بنصوص مكررة لمجرد تحسين SEO.' },
      { title: 'جودة البيانات', text: 'إذا ظهر عنوان غير واضح أو نتيجة غير مناسبة، أرسل بلاغًا من صفحة التواصل حتى يمكن تحسين الفهرسة.' },
    ],
  },
  '/offline-library': {
    heading: 'المكتبة دون اتصال بالإنترنت',
    intro: 'المكتبة غير المتصلة تسمح بالوصول إلى مواد مختارة بعد حفظها محليًا. هذه الوظيفة مفيدة أثناء السفر أو ضعف الشبكة، لكنها لا تعني أن كل محتوى الموقع يصبح متاحًا دائمًا دون اتصال.',
    blocks: [
      { title: 'ما الذي يُحفظ؟', text: 'يتم حفظ المواد التي يدعمها وضع الأوفلاين، وقد تختلف سعتها باختلاف الجهاز والمساحة المتاحة.' },
      { title: 'المزامنة', text: 'قد تتأخر مزامنة المفضلة أو التقدم حتى يعود الاتصال. لا تعتمد على الأوفلاين كسجل وحيد إذا كانت المعلومة مهمة.' },
      { title: 'تحديث المحتوى', text: 'بعض المواد تتغير، لذلك قد تحتاج إلى تحديث النسخة المحلية عندما يعود الإنترنت حتى ترى آخر مراجعة.' },
      { title: 'الخصوصية', text: 'البيانات المحفوظة على الجهاز ينبغي حمايتها بقفل الهاتف، خصوصًا إذا كانت تتضمن ملاحظات أو تفضيلات شخصية.' },
    ],
  },
};

type UtilityContentPage = {
  heading: string;
  intro: string;
  blocks: { title: string; text: string }[];
};

const UTILITY_CONTENT_EN: Record<string, UtilityContentPage> = {
  "/prayer-times": {
    heading: "Prayer times and calculation settings",
    intro: "Prayer times depend on geographic location, calculation method and time zone. ZIKR presents them as a practical aid that needs correct settings and local verification when a mosque or recognized authority follows a specific timetable.",
    blocks: [
      { title: "Location and calculation method", text: "Times can differ slightly between cities and calculation methods. Confirm the city, coordinates and time zone before relying on the result, especially after travel or when changing devices." },
      { title: "Accuracy and service limits", text: "A calculated time is not proof that every local circumstance is identical. When a local mosque or recognized religious authority publishes a timetable, compare it with the app if you notice a difference." },
      { title: "Optional reminders", text: "Notifications are optional prompts, not a guarantee that every device will deliver an alert. Battery restrictions, browser permissions and operating-system settings can affect delivery." },
      { title: "Source and religious context", text: "The page uses a technical calculation service. Detailed questions about the legal boundaries of prayer times should be checked with qualified scholarship and the relevant local authority." },
    ],
  },
  "/qibla": {
    heading: "Qibla direction and location guidance",
    intro: "The Qibla tool estimates the direction from a location toward the Kaaba. When it uses a phone compass, the result also depends on device sensors and the surrounding environment, so it should be treated as a helpful guide rather than an infallible instrument.",
    blocks: [
      { title: "Compass accuracy", text: "Magnets, phone cases and nearby metal or electrical equipment can affect a digital compass. Recalibrate the device or move away from possible interference when the heading appears unstable." },
      { title: "Location permission", text: "The tool may request location access to calculate the direction from your current position. You can decline permission; manual location entry or another available method may still be used." },
      { title: "Practical verification", text: "When arriving in an unfamiliar place, compare the direction with a nearby mosque or another trusted reference if the compass is unstable. Recheck the reading after moving away from interference." },
      { title: "Religious questions", text: "The tool helps identify a direction. Jurisprudential questions about facing the Qibla while travelling, unable to determine direction or correcting an earlier mistake belong to qualified religious guidance." },
    ],
  },
  "/tasbeeh": {
    heading: "Digital Tasbeeh and remembrance counter",
    intro: "A digital counter is an optional way to track repetitions; it is not a condition for the validity of remembrance. ZIKR provides the tool to reduce counting effort without making worship dependent on a screen.",
    blocks: [
      { title: "Counting is a tool, not the goal", text: "You can remember Allah without a phone. A counter is simply an optional visual aid for people who find it useful to track a repetition or review a routine." },
      { title: "Use established counts carefully", text: "When a transmitted text specifies a count, follow the wording and source. Do not treat a number selected by the interface as a religious prescription without supporting evidence." },
      { title: "Protect attention", text: "Avoid turning the screen into a distraction. You can silence unrelated notifications or use a simple view during a remembrance session." },
      { title: "Privacy by design", text: "A counter does not need personal data. Any private record of a daily wird should remain under the user's control and should not be shared without a clear reason." },
    ],
  },
  "/memorization": {
    heading: "Quran memorization and review method",
    intro: "Sustainable memorization depends on repetition, review and realistic progress. ZIKR's tools can organize sessions and track a plan, but they do not replace correction of recitation by a qualified teacher.",
    blocks: [
      { title: "Choose a sustainable plan", text: "Select an amount you can repeat each week and include revision from the beginning. Adding new passages without reviewing earlier material often weakens retention." },
      { title: "Test recall, not just playback", text: "A meaningful memorization check is recalling the passage without looking. You can recite to a teacher, record a session or ask a trusted person to listen, then review the mistakes." },
      { title: "Space review sessions", text: "Reviewing material across several days can be more useful than one long session. Adjust the schedule to your time and ability rather than forcing a fixed pace." },
      { title: "Correct mistakes calmly", text: "A memorization error should be corrected with the Mushaf, a reliable recitation and a teacher when needed. If the wording or reading is unclear, verify it before continuing." },
    ],
  },
  "/wird": {
    heading: "Daily wird and building a spiritual routine",
    intro: "A daily wird is a personal routine for reading, remembrance and supplication. The most useful plan is one that can be maintained on ordinary busy days and resumed after an interruption without creating unnecessary pressure.",
    blocks: [
      { title: "Begin with a small minimum", text: "Choose a clear, modest amount that you can complete even on a busy day. Add more when time and attention allow, rather than making the routine difficult to restart." },
      { title: "Track progress without pressure", text: "A record is a review tool, not a judgment of faith. Use it to notice patterns: when you read, what interrupts the routine and which time works best." },
      { title: "Connect the routine to your day", text: "You may attach a short wird to an existing moment, such as after prayer or at a regular morning or evening time. Keep enough flexibility for travel and changes in work." },
      { title: "Return after an interruption", text: "When a routine stops, restart with one manageable step instead of trying to compensate for every missed session at once. Consistency grows through realistic repetition." },
    ],
  },
  "/zakat": {
    heading: "Introductory guidance about Zakat",
    intro: "This page helps organize general information about Zakat; it does not provide a binding calculation for every individual. The ruling can depend on asset type, ownership, Nisab, the passage of a lunar year, debts and other details.",
    blocks: [
      { title: "Organize the information first", text: "Before calculating, identify which assets you actually own, which are shared, owed to another person or held in trust, and record the relevant dates where needed." },
      { title: "Recognize areas of jurisprudential difference", text: "Some questions about shares, trade goods and debts involve recognized detail and scholarly disagreement. They should not be reduced to one automatic number without understanding the circumstances." },
      { title: "Consult a qualified source", text: "For a binding calculation, consult a recognized fatwa authority or qualified scholar who can review your situation. Bring organized information rather than relying on an unattributed post." },
      { title: "Protect financial privacy", text: "Do not enter account numbers, card details or other sensitive financial information into a public field. Organizing a calculation does not require exposing private identifiers." },
    ],
  },
  "/spiritual-ai": {
    heading: "Using spiritual AI responsibly",
    intro: "The spiritual assistant is a tool for search, summarization and finding references. It is not a scholar or a fatwa authority. Automated answers can misquote a source, miss context or attribute a statement incorrectly, so verification remains essential.",
    blocks: [
      { title: "An answer is not a source", text: "When the system provides an explanation or summary, open the linked reference and check the wording and context, especially for Quran, Hadith and religious rulings." },
      { title: "Personal religious questions need a specialist", text: "A detailed ruling or a question about a personal circumstance should be addressed to a qualified specialist. AI can help organize the question or locate terminology, but it cannot replace a fatwa." },
      { title: "Watch for invented quotations and attribution", text: "A model may produce inaccurate quotations or assign words to a scholar who never said them. Do not publish an answer as a source without independent verification." },
      { title: "Do not overshare private information", text: "Avoid entering secrets or sensitive personal data into an AI service for a general question. Review the privacy terms before using features that store or synchronize information." },
    ],
  },
  "/radio": {
    heading: "Quran radio and continuous listening",
    intro: "Radio can make recitation part of the day, but a stream depends on an external provider and can be affected by the network or service availability. ZIKR therefore keeps reading options available alongside listening.",
    blocks: [
      { title: "Streaming and reading serve different needs", text: "Listening may fit some activities, while reading and reflection require a different level of attention. Do not make a continuous stream the only way you learn or review." },
      { title: "Identify the external provider", text: "Audio may come from another broadcaster or service, which remains responsible for the stream and its terms. Show the source clearly and do not claim ownership of third-party material." },
      { title: "Plan for interruptions", text: "Pause the stream when the connection is weak and use the Mushaf or supported offline material when available. A provider outage should not block access to reading." },
      { title: "Keep the player calm and predictable", text: "Prefer simple playback controls that do not overwhelm the content or open unnecessary windows. Audio should begin only when the visitor chooses to play it." },
    ],
  },
  "/youtube": {
    heading: "YouTube channel and external video content",
    intro: "The YouTube section connects video material with topics inside ZIKR. Its added value should come from organization, description and context—not from copying other creators' videos and presenting them as original ZIKR productions.",
    blocks: [
      { title: "Explain each video", text: "Tell the visitor what the video covers, why it may be useful and how it relates to the page. The description should make sense before the viewer presses play." },
      { title: "Identify the publisher", text: "Show the channel or original publisher and avoid attributing a video to ZIKR when another creator produced it." },
      { title: "Respect copyright and platform terms", text: "Embedding a video through YouTube is different from re-uploading or storing the file. Respect the platform's terms and the rights of the creator." },
      { title: "Review claims critically", text: "For religious and historical topics, compare important claims with original references before treating the video as a verified source or sharing its conclusions." },
    ],
  },
  "/search": {
    heading: "Searching the ZIKR library",
    intro: "Search is a way to reach content, not an editorial page in itself. Useful results depend on clear titles, relevant content and an index that does not treat every query as a separate page that should be published or indexed.",
    blocks: [
      { title: "Use a focused search term", text: "A chapter name, Companion's name or article topic will usually produce more useful results than a very long sentence. Add another keyword when the first results are too broad." },
      { title: "Open the original page", text: "A search result is only a starting point. When you reach a Hadith or historical article, open the source page and review the references." },
      { title: "Search results are functional screens", text: "Query screens are navigation tools. They should not be filled with repeated text merely to improve SEO or treated as independent articles." },
      { title: "Report poor or unclear results", text: "If a title is unclear or the result does not match the query, report the search term and page where the problem appears so the index can be improved." },
    ],
  },
  "/offline-library": {
    heading: "Using the library offline",
    intro: "The offline library gives access to supported material after it has been saved locally. This is useful while travelling or when connectivity is weak, but it does not mean that every page or every external service is permanently available without a connection.",
    blocks: [
      { title: "Understand what is stored", text: "Only material supported by the offline mode can be saved. Available storage and content coverage may vary with the device and the local space remaining." },
      { title: "Allow changes to synchronize", text: "Saved items or progress may synchronize later when the connection returns. Do not treat the offline copy as the only record of information that you need to preserve." },
      { title: "Refresh older material", text: "Some pages and references change. Update the local copy when you are online so you can access the latest reviewed version." },
      { title: "Secure the device", text: "Protect the phone with a screen lock, especially when local data includes personal notes or preferences. Remove saved material you no longer need." },
    ],
  },
};

export function EditorialUtilityDepth({ pathname, locale = "ar" }: { pathname: string; locale?: Locale }) {
  const clean = pathname.split('?')[0].replace(/\/$/, '') || '/';
  const page = locale === "en" ? UTILITY_CONTENT_EN[clean] : UTILITY_CONTENT[clean];
  if (!page) return null;

  const direction = locale === "ar" ? "rtl" : "ltr";

  return (
    <section className="cv-auto border-y border-brand-gold/10 bg-black/10 px-3 py-10 sm:px-4 sm:py-12" dir={direction} aria-labelledby="utility-editorial-title">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold/45">{locale === "ar" ? "دليل استخدام موسع" : "EXTENDED USER GUIDE"}</p>
          <h2 id="utility-editorial-title" className="text-3xl font-bold text-brand-gold">{page.heading}</h2>
          <p className="mx-auto max-w-4xl leading-8 text-brand-cream/65">{page.intro}</p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {page.blocks.map(block => (
            <Card key={block.title} className="space-y-3 p-5 leading-8">
              <h3 className="font-bold text-brand-gold">{block.title}</h3>
              <p className="text-sm text-brand-cream/65">{block.text}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
