/* Chair Tai Chi funnel — screen config.
 * Step ORDER, element TYPES, and QUESTION/OPTION labels mirror the captured digestiplan
 * chair funnel (88 screenshots) 1:1. Interstitial ("info") titles/bodies are ORIGINAL wording
 * (no verbatim marketing prose, no fabricated stats, no false sources).
 * Flow: gender (gate) -> age (gate) -> these screens -> loader -> email -> name -> goals -> checkout.
 *
 * Screen types: single | multi | input | info | loader | email | name | goals
 * Flags: section, layout("cards"|"ld"), statement, sub, noneValue/noneLabel/noneEmoji, computeBMI,
 *        photos(bool), chart(bool), femaleOnly(bool, skipped when gender==='male'), personalize(bool),
 *        safetyNote.
 */
window.FUNNEL = {
  product: "chair-taichi",
  brand: "Chair Tai Chi",
  screens: [
    // ============ My profile ============
    { id: "tried_before", type: "single", section: "My profile",
      q: "Have you tried Chair Tai Chi before?", figure: "assets/2_tried.webp",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },

    { id: "intro_encourage", type: "info", image: "assets/3.webp",
      title: "You're in the right place",
      body: "Chair Tai Chi is gentle and beginner-friendly — practised at home using just a chair. Most people feel a difference sooner than they expect." },

    { id: "focus_areas", type: "multi", section: "My profile", photos: true,
      q: "To start, tell us which areas you'd like to focus on:", sub: "Choose all that apply",
      options: [
        { value: "lose_weight", label: "Lose weight", img: "assets/4a_wight.webp" },
        { value: "feel_healthier", label: "Feel healthier", img: "assets/4b_health.webp" },
        { value: "lower_stress", label: "Lower stress", img: "assets/4c_stress.webp" },
        { value: "memory_focus", label: "Boost memory & focus", img: "assets/4d_focus.webp" },
      ] },

    { id: "intro_solution", type: "info", personalize: true, image: "assets/5.webp",
      title: "This could be a great fit",
      body: "For {genderPlural} in their {decade}, Chair Tai Chi is a gentle way to feel better with minimal effort — around 10–15 minutes a day to start seeing changes." },

    { id: "body_now", type: "single", section: "My profile", layout: "cards",
      q: "How would you describe your body?",
      options: [{ value: "thin", label: "Thin", img: "assets/6_thin.webp" }, { value: "mid", label: "Mid-sized", img: "assets/6_mid.webp" },
        { value: "plump", label: "Plump", img: "assets/6_plump.webp" }, { value: "plus", label: "Plus-sized", img: "assets/6_plus.webp" }] },

    { id: "dream_body", type: "single", section: "My profile", layout: "cards",
      q: "What's your “dream body”?",
      options: [{ value: "slim", label: "Slim", img: "assets/7_slim.webp" }, { value: "toned", label: "Toned", img: "assets/7_toned.webp" },
        { value: "curvy", label: "Curvy", img: "assets/7_curvy.webp" }, { value: "sizes", label: "Few sizes smaller", img: "assets/7_smaller.webp" }] },

    { id: "target_areas", type: "multi", section: "My profile", photos: true,
      q: "Which areas do you want to focus on?", sub: "Choose all that apply",
      options: [{ value: "legs", label: "Legs", img: "assets/8_legs.webp" }, { value: "belly", label: "Belly", img: "assets/8_belly.webp" },
        { value: "arms", label: "Arms", img: "assets/8_arms.webp" }, { value: "butt", label: "Butt", img: "assets/8_butt.webp" },
        { value: "face_neck", label: "Face and neck", img: "assets/8_neck.webp" }] },

    { id: "height", type: "input", section: "My profile",
      q: "What's your height?", sub: "We'll use this to set a sensible, healthy pace.",
      units: ["cm", "ft"], field: "height" },

    { id: "weight", type: "input", section: "My profile",
      q: "What's your current weight?", units: ["kg", "lb"], field: "weight", computeBMI: true },

    { id: "goal_weight", type: "input", section: "My profile",
      q: "Got it! And what's your goal weight?",
      sub: "An estimate will do — you can easily change this later.",
      units: ["kg", "lb"], field: "goal_weight" },

    { id: "projection_1", type: "info", image: "assets/13.webp",
      title: "You'll get there sooner than you think",
      body: "With a routine matched to you, steady progress is realistic — and we'll keep adapting it as you go." },

    { id: "intro_plan", type: "info", personalize: true, image: "assets/14.webp",
      title: "A goal without a plan is just a wish",
      body: "{genderPlural} in their {decade} often need an approach tailored to their needs. Tell us a little more so we can build a Chair Tai Chi plan that's right for you." },

    // ============ Activity ============
    { id: "last_in_shape", type: "single", section: "Activity",
      q: "When were you last in the best shape of your life?",
      options: [{ value: "lt1", label: "Less than a year ago", emoji: "🤔" },
        { value: "1to2", label: "1 to 2 years ago", emoji: "😮" },
        { value: "gt3", label: "More than 3 years ago", emoji: "😥" },
        { value: "never", label: "Never", emoji: "🙅" }] },

    { id: "typical_day", type: "single", section: "Activity",
      q: "What does your typical day look like?",
      options: [{ value: "sitting", label: "I spend most of the day sitting", emoji: "💻" },
        { value: "some", label: "I move around from time to time", emoji: "🚶" },
        { value: "active", label: "I'm on my feet all day long", emoji: "👟" }] },

    { id: "activities", type: "multi", section: "Activity",
      q: "Are any of these activities part of your life?", sub: "Choose all that apply",
      options: [{ value: "pet", label: "Walking my pet", emoji: "🐕" },
        { value: "child", label: "Spending a lot of active time with my child", emoji: "👨‍👩‍👧" },
        { value: "stairs", label: "Climbing stairs frequently", emoji: "🪜" },
        { value: "household", label: "Active household tasks", emoji: "🏡" }],
      noneValue: "none", noneLabel: "No", noneEmoji: "🙅" },

    { id: "walks_freq", type: "single", section: "Activity",
      q: "How often do you go for walks?",
      options: [{ value: "daily", label: "Almost every day" }, { value: "3to4", label: "3–4 times per week" },
        { value: "1to2", label: "1–2 times per week" }, { value: "rare", label: "Once a month or less" }] },

    { id: "intro_effective", type: "info", image: "assets/18.webp",
      title: "Gentle doesn't mean ineffective",
      body: "Slow, mindful Chair Tai Chi trains balance, mobility and steady strength — a safe alternative to high-impact workouts that still does real work." },

    { id: "relate_breath", type: "single", section: "Activity", layout: "ld", cardImg: "assets/19_stairs.webp",
      q: "Do you relate to the following statement?",
      statement: "I'm out of breath after walking up one flight of stairs",
      options: [{ value: "no", label: "No", emoji: "🚫" }, { value: "yes", label: "Yes", emoji: "✅" }] },

    { id: "relate_hard", type: "single", section: "Activity", layout: "ld", cardImg: "assets/20_excersize.webp",
      q: "Do you relate to the following statement?",
      statement: "I tend to give up when workouts feel too hard or boring",
      options: [{ value: "no", label: "No", emoji: "🚫" }, { value: "yes", label: "Yes", emoji: "✅" }] },

    { id: "relate_progress", type: "single", section: "Activity", layout: "ld", cardImg: "assets/21_workout.webp",
      q: "Do you relate to the following statement?",
      statement: "I'm not sure how to choose workouts that suit me",
      options: [{ value: "no", label: "No", emoji: "🚫" }, { value: "yes", label: "Yes", emoji: "✅" }] },

    { id: "intro_eligible", type: "info", chart: true,
      title: "Good news — you're eligible!",
      body: "Your answers line up well with a gentle, seated routine. Here's how progress could build over your first weeks." },

    { id: "pain_points", type: "multi", section: "Activity", layout: "cards",
      q: "Are any of the following an issue for you?", sub: "Your plan will adapt to keep you comfortable and safe",
      options: [{ value: "back", label: "Sensitive back", img: "assets/23_back.webp" },
        { value: "knees", label: "Achy knees", img: "assets/23_knees.webp" },
        { value: "hips", label: "Tight hips", img: "assets/23_hips.webp" }],
      noneValue: "none", noneLabel: "None of the above", noneImg: "assets/23_none.webp" },

    { id: "intro_lowimpact", type: "info", image: "assets/24.webp",
      title: "Easier on knees and back",
      body: "Because it's seated and low-impact, Chair Tai Chi keeps stress off your joints — a gentle choice if you're prone to aches or stiffness." },

    { id: "where_exercise", type: "multi", section: "Activity",
      q: "Where do you prefer to exercise?", sub: "Choose all that apply",
      options: [{ value: "home", label: "Home", emoji: "🏠" }, { value: "outside", label: "Outside", emoji: "🌳" },
        { value: "gym", label: "Gym", emoji: "🏋️" }, { value: "any", label: "No preference", emoji: "🤷" }] },

    { id: "intro_home", type: "info", image: "assets/26.webp",
      title: "Your home works perfectly",
      body: "All you need is a sturdy chair and a little space — no equipment, no commute. Practise whenever it suits you." },

    { id: "steps_need", type: "single", section: "Activity",
      q: "How many steps do you think you need in a day?",
      options: [{ value: "easy", label: "Easy: <5K steps", emoji: "👌" },
        { value: "medium", label: "Medium: 5–10K steps", emoji: "🔥" },
        { value: "hard", label: "Hard: >10K steps", emoji: "🏅" },
        { value: "unsure", label: "I'm not sure", emoji: "🤷" }] },

    { id: "intro_lowdose", type: "info", image: "assets/28.webp",
      title: "You may need less than you think",
      body: "Short, gentle daily practice is easier to keep up than long, occasional workouts — and consistency is what moves the needle." },

    // like / dislike series (image card + 👎/😐/👍)
    { id: "ld_mobility", type: "single", section: "Activity", layout: "ld", cardImg: "assets/29.webp",
      q: "Like or dislike?", statement: "Stretching & Mobility",
      options: [{ value: "dislike", label: "Dislike", emoji: "👎" }, { value: "neutral", label: "Neutral", emoji: "😐" }, { value: "like", label: "Like", emoji: "👍" }] },
    { id: "ld_breathing", type: "single", section: "Activity", layout: "ld", cardImg: "assets/30.webp",
      q: "Like or dislike?", statement: "Mindful breathing",
      options: [{ value: "dislike", label: "Dislike", emoji: "👎" }, { value: "neutral", label: "Neutral", emoji: "😐" }, { value: "like", label: "Like", emoji: "👍" }] },
    { id: "ld_balance", type: "single", section: "Activity", layout: "ld", cardImg: "assets/31.webp",
      q: "Like or dislike?", statement: "Balance",
      options: [{ value: "dislike", label: "Dislike", emoji: "👎" }, { value: "neutral", label: "Neutral", emoji: "😐" }, { value: "like", label: "Like", emoji: "👍" }] },

    { id: "projection_2", type: "info", image: "assets/33.webp", full: true,
      title: "You'll reach your goal sooner than expected",
      body: "With a routine matched to your preferences, steady progress is realistic — and we'll keep adapting it as you go." },

    // ============ Lifestyle ============
    { id: "tension", type: "single", section: "Lifestyle",
      q: "Do you ever feel mentally tense or on edge?",
      options: [{ value: "lots", label: "I feel that a lot lately", emoji: "😫" },
        { value: "some", label: "I have some ups and downs", emoji: "😐" },
        { value: "steady", label: "I feel mostly steady", emoji: "😌" }] },

    { id: "intro_stress", type: "info", image: "assets/35.webp", full: true,
      title: "Movement and breath calm the mind",
      body: "Slow, mindful movement paired with steady breathing is a well-known way to ease tension and feel more grounded." },

    { id: "water", type: "single", section: "Lifestyle",
      q: "What is your daily water intake?", sub: "It's important to stay hydrated when you move.",
      options: [{ value: "coffee", label: "I mainly drink coffee or tea", emoji: "☕" },
        { value: "low", label: "About 2 glasses", emoji: "💧" },
        { value: "mid", label: "2 to 6 glasses", emoji: "💦" },
        { value: "high", label: "More than 6 glasses", emoji: "🌊" }] },

    { id: "mood", type: "single", section: "Lifestyle",
      q: "How's your mood most days?",
      options: [{ value: "low", label: "Low — I often feel down or irritable", emoji: "🔴" },
        { value: "mixed", label: "Up and down — it depends on the day", emoji: "🟡" },
        { value: "steady", label: "Steady — I usually feel okay", emoji: "🟢" }] },

    { id: "intro_focus", type: "info", image: "assets/38.webp", full: true,
      title: "Feel calmer and more focused",
      body: "Regular gentle movement supports energy, focus and emotional steadiness — and it's easy to keep up when it's enjoyable." },

    { id: "rested", type: "single", section: "Lifestyle",
      q: "How often do you wake up feeling rested?",
      options: [{ value: "always", label: "Always", emoji: "😊" }, { value: "often", label: "Frequently", emoji: "😌" },
        { value: "rare", label: "Infrequently", emoji: "🤭" }, { value: "never", label: "Never", emoji: "😴" }] },

    { id: "sleep_improve", type: "multi", section: "Lifestyle",
      q: "Is there anything you want to improve about your sleep?", sub: "Choose all that apply",
      options: [{ value: "ok", label: "No, I sleep well" }, { value: "fall", label: "Difficulty falling asleep" },
        { value: "tired", label: "Waking up tired" }, { value: "night", label: "Waking up during the night" },
        { value: "flashes", label: "Hot flashes / Night sweats", femaleOnly: true }, { value: "schedule", label: "Lack of sleep schedule" }] },

    { id: "intro_sleep", type: "info", image: "assets/41.webp",
      title: "Gentle activity supports better sleep",
      body: "Light daytime movement and a calmer nervous system can help you fall asleep more easily and rest more deeply." },

    { id: "diet", type: "multi", section: "Lifestyle",
      q: "Are you currently following a specific dietary pattern?", sub: "Choose all that apply",
      options: [{ value: "no", label: "No" }, { value: "lowcarb", label: "Low-carb" }, { value: "veg", label: "Vegetarian" },
        { value: "plant", label: "Fully plant-based" }, { value: "pesc", label: "Pescatarian" }, { value: "lactose", label: "Lactose-free" },
        { value: "gluten", label: "Gluten-free" }, { value: "keto", label: "Keto" }, { value: "other", label: "Other" }] },

    { id: "produce", type: "single", section: "Lifestyle",
      q: "How's your fruit and vegetable intake?", sub: "Generally, how many fruit and veggies do you eat a day?",
      options: [{ value: "low", label: "None or a little", emoji: "🙅" },
        { value: "fair", label: "A fair bit", emoji: "🍎" },
        { value: "lots", label: "I might be a rabbit", emoji: "🥕" }] },

    { id: "intro_nutrition", type: "info", image: "assets/43b.jpg",
      title: "Simple nutrition support, no strict diets",
      body: "You'll get easy, optional nutrition tips that complement your routine — no calorie counting or food rules required." },

    { id: "cravings", type: "multi", section: "Lifestyle",
      q: "What foods do you crave most often?", sub: "Choose all that apply",
      options: [{ value: "sweet", label: "Sweet treats", emoji: "🧁" }, { value: "salty", label: "Salty snacks", emoji: "🥨" },
        { value: "fast", label: "Fast food", emoji: "🍟" }, { value: "wine", label: "I like my wine", emoji: "🍷" },
        { value: "soda", label: "Soda", emoji: "🥤" }], noneValue: "none", noneLabel: "None of the above", noneEmoji: "🤷" },

    { id: "habits", type: "multi", section: "Lifestyle",
      q: "Do you have any of the following habits?", sub: "Choose all that apply",
      options: [{ value: "emotional", label: "Emotional or boredom eating", emoji: "😫" },
        { value: "full", label: "Continuing to eat when full", emoji: "🍩" },
        { value: "late", label: "Late-night snacking", emoji: "🌙" },
        { value: "screen", label: "Mixing screen time with mealtime", emoji: "💻" },
        { value: "skip", label: "Skipping meals too often", emoji: "🍽️" }], noneValue: "none", noneLabel: "None of the above", noneEmoji: "🤷" },

    { id: "tracker", type: "single", section: "Lifestyle",
      q: "Do you wear a smartwatch or fitness tracker?", sub: "Like: Apple Watch, Fitbit, Samsung Galaxy, etc.",
      options: [{ value: "yes", label: "Yes", emoji: "✔️" }, { value: "no", label: "No", emoji: "✖️" }] },

    { id: "intro_brain", type: "info", image: "assets/47b.png",
      title: "Look after your brain, not just your body",
      body: "Staying gently active is associated with sharper memory and better brain health as we age. A short daily routine is one of the simplest ways to help protect your mind for the years ahead." },

    // ============ Health & Safety ============
    { id: "medications", type: "single", section: "Health & Safety",
      q: "Are you taking any medications?", sub: "Rest assured, this is just for your safety.",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },

    { id: "mobility", type: "single", section: "Health & Safety",
      q: "Do you have any physical or mobility restrictions we should know about?",
      sub: "Rest assured, this is just for your safety.",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "na", label: "Prefer not to answer" }] },

    { id: "menopause", type: "single", section: "Health & Safety", femaleOnly: true,
      q: "Have you gone through menopause?", sub: "Hormonal changes can impact your metabolism and nutritional needs.",
      options: [{ value: "no", label: "No" }, { value: "going", label: "Going through it" },
        { value: "passed", label: "Already passed it" }, { value: "unsure", label: "Not sure" },
        { value: "na", label: "Prefer not to answer" }] },

    // ============ Almost there ============
    { id: "intro_almost", type: "loader", title: "Almost done…",
      steps: ["Reviewing your answers", "Personalizing your plan"] },

    { id: "main_reason", type: "multi", section: "Almost there",
      q: "What's your main reason for wanting to get in shape?", sub: "Choose all that apply",
      options: [{ value: "confident", label: "Feel more confident in my body" },
        { value: "energetic", label: "Feel healthier and more energetic" },
        { value: "look", label: "Change how I look" }, { value: "clothes", label: "Fit in my clothes better" },
        { value: "other", label: "Other" }] },

    { id: "motivates", type: "multi", section: "Almost there",
      q: "What motivates you to exercise?", sub: "Choose all that apply",
      options: [{ value: "health", label: "Improving health" }, { value: "immune", label: "Boosting immune system" },
        { value: "look", label: "Looking better" }, { value: "strength", label: "Building strength and endurance" },
        { value: "mood", label: "Managing stress / improving mood" },
        { value: "example", label: "Setting a positive example for others" }, { value: "other", label: "Other" }] },

    { id: "motivation_level", type: "single", section: "Almost there",
      q: "Right now, how motivated are you to reach your happy weight?",
      options: [{ value: "ready", label: "I'm 100% ready" }, { value: "hopeful", label: "I'm pretty hopeful about it" },
        { value: "unsure", label: "I'm a bit unsure" }, { value: "easy", label: "I'm kinda taking it easy" }] },

    { id: "obstacles", type: "multi", section: "Almost there",
      q: "What made it hard for you to stay motivated to exercise in the past?", sub: "Choose all that apply",
      options: [{ value: "results", label: "Didn't see noticeable results" },
        { value: "regain", label: "I'd lose weight, but gain it back" },
        { value: "noplan", label: "Didn't have a clear effective plan" },
        { value: "toohard", label: "Previous plans were too hard" },
        { value: "notime", label: "Didn't have the time to exercise" },
        { value: "coaching", label: "Ineffective coaching" },
        { value: "none", label: "I didn't face any obstacles" }, { value: "other", label: "Other" }] },

    { id: "intro_sustainable", type: "info", image: "assets/57b.png", femaleOnly: true,
      title: "Support your body through midlife changes",
      body: "Hormonal shifts around menopause can change how your body stores energy and make weight feel harder to manage. Gentle daily movement, paired with simple nutrition guidance, is a supportive way to feel more in control of your wellness goals." },

    { id: "explore", type: "multi", section: "Almost there",
      q: "While we customize your journey, what else do you want to explore?", sub: "Choose all that apply",
      options: [{ value: "energy", label: "Upping my energy levels" }, { value: "habits", label: "Cultivating healthy behaviors" },
        { value: "digestion", label: "Understand digestion" }, { value: "stress", label: "Reducing stress" },
        { value: "flex", label: "Improving flexibility" }, { value: "posture", label: "Getting better posture" },
        { value: "endurance", label: "Improving endurance" }, { value: "immune", label: "Boosting my immune system" }] },

    { id: "pace", type: "single", section: "Almost there",
      q: "Your Chair Tai Chi plan is ready! How quickly do you want to get in shape?",
      options: [{ value: "fast", label: "As quickly as possible" }, { value: "slow", label: "Slow and steady does it" },
        { value: "between", label: "Somewhere between the two" }] },

    { id: "intro_paced", type: "info",
      title: "Perfect — we've matched your pace",
      body: "And it doesn't stop here: we'll adapt your plan as your body and activity level change throughout your journey." },

    { id: "intro_focus20", type: "info", chart: true,
      title: "A few minutes a day adds up",
      body: "Short, regular sessions support focus, energy and clearer thinking — small efforts that compound over time." },

    { id: "daypart", type: "single", section: "Almost there",
      q: "When do you feel most “on” — morning or night?",
      options: [{ value: "morning", label: "Morning" }, { value: "night", label: "Night" }, { value: "depends", label: "It depends" }] },

    // ============ Plan generation + capture ============
    { id: "loader", type: "loader", title: "Just a moment…", sub: "Getting things ready for you", per: 1600,
      cards: [
        { img: "assets/bodies_2b.jpg", text: "Built with care, for how you move" },
        { img: "assets/3.webp", text: "We focus on how your body feels — not dieting" },
        { img: "assets/5.webp", text: "Small, steady habits are what last" },
        { img: "assets/29.webp", text: "A plan you can actually keep up with" },
        { img: "assets/43b.jpg", text: "Just follow your plan, one short session at a time" },
        { img: "assets/38.webp", text: "It only takes a few minutes a day" },
        { img: "assets/57b.png", text: "Off days are completely okay" },
        { img: "assets/41.webp", text: "No one's perfect — we'll help you keep going" },
        { img: "assets/24.webp", text: "We'll help you get back on track" },
      ] },

    { id: "email", type: "email", title: "Your action plan is ready",
      sub: "Enter your email to get your personal Chair Tai Chi plan." },

    { id: "name", type: "name", title: "What's your name?" },

    { id: "goals", type: "goals" },
  ],
};
