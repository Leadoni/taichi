/* Chair Tai Chi funnel — screen config.
 * SEQUENCE + functional question/option labels mirror the captured digestiplan chair funnel 1:1
 * (see "Digesti quiz — copy spec"). Interstitial ("info") titles/bodies are ORIGINAL wording:
 * no verbatim marketing prose, no fabricated stats, no fake sources, no invented testimonials/counts.
 * Flow: gender (gate) -> age (gate) -> these screens -> email -> name -> goals -> checkout.
 *
 * Types: single | multi | input | info | loader | email | name | goals
 * Flags: section, layout("cards"|"ld"), statement, sub, image, full, cardImg, photos, chart,
 *        femaleOnly, personalize, safetyNote, computeBMI, units, field, figure,
 *        noneValue/noneLabel/noneEmoji/noneImg, per, cards, options[].img
 */
window.FUNNEL = {
  product: "chair-taichi",
  brand: "Chair Tai Chi",
  screens: [
    // ===================== My profile =====================
    { id: "tried_before", type: "single", section: "My profile", figure: "assets/2c_tried.webp",
      q: "Have you tried Chair Tai Chi before?",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },

    { id: "intro_encourage", type: "info", image: "assets/3.webp",
      title: "You'll do fantastic!",
      body: "Chair Tai Chi is a gentle and effective fitness option.\n\nYou'll **get in shape at home using only a chair** — sooner than you might think!" },

    { id: "focus_areas", type: "multi", section: "My profile", photos: true,
      q: "To start, tell us which areas you'd like to focus on:", sub: "Choose all that apply",
      options: [
        { value: "lose_weight", label: "Lose weight", img: "assets/4a_wight.webp" },
        { value: "feel_healthier", label: "Feel healthier", img: "assets/4b_health.webp" },
        { value: "lower_stress", label: "Lower stress", img: "assets/4c_stress.webp" },
        { value: "memory_focus", label: "Boost memory & focus", img: "assets/4d_focus.webp" },
      ] },

    { id: "intro_solution", type: "info", personalize: true, image: "assets/5.webp",
      title: "We've got just the solution!",
      body: "For {genderPlural} in their {decade}, Chair Tai Chi is an excellent option to **slim down with minimal effort**.\n\n10–15 minutes a day to see first changes." },

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
      q: "What's your height?", sub: "We'll use this information to determine your ideal weight loss pace",
      units: ["cm", "ft"], field: "height" },

    { id: "weight", type: "input", section: "My profile",
      q: "What's your current weight?", units: ["kg", "lb"], field: "weight", computeBMI: true },

    { id: "goal_weight", type: "input", section: "My profile",
      q: "Got it! And what's your goal weight?",
      sub: "An estimate will do - you can easily change this later.",
      units: ["kg", "lb"], field: "goal_weight",
      noteTitle: "Realistic goal!",
      note: "A gentle, gradual target is easier to reach and to keep. Small, steady change is the kind that lasts." },

    { id: "intro_smallchange", type: "info", image: "assets/bodies_2b.jpg",
      title: "Losing just 5% of your weight can improve your health",
      body: "Even a small, steady change can lower your risk of many common health conditions — and Chair Tai Chi makes it easy to start.\n\nSource: American Heart Association (AHA)." },

    { id: "projection_1", type: "info", projChart: true, headerTop: true,
      title: "We predict you'll hit <span class='hl'>{goal}kg</span> by {projdate}",
      blockTitle: "You only have to lose {lose} kg",
      blockBody: "That's about {pct}% of your body weight. According to the American Heart Association, reaching this can lower your risk of diabetes, high blood pressure and other health conditions." },

    { id: "intro_plan", type: "info", personalize: true, image: "assets/14b.webp",
      title: "A goal without a plan is just a wish",
      body: "{genderPlural} in their {decade} may need an approach **tailored to their unique needs**.\n\nTell us a little more about you so we can build a Chair Tai Chi Workout Plan that's right for you!" },

    // ===================== Activity =====================
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
      options: [{ value: "daily", label: "Almost every day" }, { value: "3to4", label: "3-4 times per week" },
        { value: "1to2", label: "1-2 times per week" }, { value: "rare", label: "Once a month or less" }] },

    { id: "intro_effective", type: "info", image: "assets/18.webp",
      title: "Chair Tai Chi: as effective as it is gentle",
      body: 'Slow, mindful movement makes a real difference. Chair Tai Chi helps you **feel healthier, build steady strength, and support your balance and mobility** — with none of the strain of high-impact workouts.\n\nSource: "Walking for Exercise", Harvard Nutrition Source' },

    { id: "relate_breath", type: "single", section: "Activity", layout: "ld", cardImg: "assets/20_stairs.jpg",
      q: "Do you relate to the following statement?",
      statement: "I'm out of breath after walking up one flight of stairs",
      options: [{ value: "no", label: "No", emoji: "🚫" }, { value: "yes", label: "Yes", emoji: "✅" }] },

    { id: "relate_hard", type: "single", section: "Activity", layout: "ld", cardImg: "assets/20_excersize.webp",
      q: "Do you relate to the following statement?",
      statement: "I tend to give up easily when exercises are too hard or boring",
      options: [{ value: "no", label: "No", emoji: "🚫" }, { value: "yes", label: "Yes", emoji: "✅" }] },

    { id: "relate_progress", type: "single", section: "Activity", layout: "ld", cardImg: "assets/21_workout.webp",
      q: "Do you relate to the following statement?",
      statement: "I'm not sure how to choose workouts that are suitable for me",
      options: [{ value: "no", label: "No", emoji: "🚫" }, { value: "yes", label: "Yes", emoji: "✅" }] },

    { id: "intro_eligible", type: "info", eligChart: true, headerTop: true,
      title: "Great news, you're eligible!",
      lead: "Looks like you're a perfect fit for Chair Tai Chi — time to crush your goals.",
      blockTitle: "Based on Tai Motion's historical data for women in their {decade}",
      blockBody: "Start seeing results in just one week and keep losing weight steadily on the path to your **{goal} kg** goal!" },

    { id: "pain_points", type: "multi", section: "Activity", layout: "cards",
      q: "Are any of the following an issue for you?", sub: "Your plan will address these to ensure your comfort and safety",
      options: [{ value: "back", label: "Sensitive back", img: "assets/23_back.webp" },
        { value: "knees", label: "Achy knees", img: "assets/23_knees.webp" },
        { value: "hips", label: "Tight hips", img: "assets/23_hips.webp" }],
      noneValue: "none", noneLabel: "None of the above", noneImg: "assets/23_none.webp" },

    { id: "intro_lowimpact", type: "info", image: "assets/25b.jpg",
      title: "Chair Tai Chi eases strain on knees and back",
      body: "Chair Tai Chi is a low-impact, moderate-intensity exercise. It minimises stress on joints such as the hips, knees, and ankles.\n\nThis makes it safer than high-impact workouts — an **excellent choice if you're prone to aches or joint pain.**" },

    { id: "where_exercise", type: "multi", section: "Activity",
      q: "Where do you prefer to exercise?", sub: "Choose all that apply",
      options: [{ value: "home", label: "Home", emoji: "🏠" }, { value: "outside", label: "Outside", emoji: "🌳" },
        { value: "gym", label: "Gym", emoji: "🏋️" }, { value: "any", label: "No preference", emoji: "🤷" }] },

    { id: "intro_home", type: "info", image: "assets/27b.jpg",
      title: "Discover the benefits of at-home fitness",
      body: "Chair Tai Chi turns your home into a calming space for practice. All you need is a sturdy chair.\n\nIt builds **strength, balance and focus**, so you can move freely — even on quieter days." },

    { id: "steps_need", type: "single", section: "Activity",
      q: "How many steps do you think you need in a day?",
      options: [{ value: "easy", label: "Easy: <5K steps", emoji: "👌" },
        { value: "medium", label: "Medium: 5-10K steps", emoji: "🔥" },
        { value: "hard", label: "Hard: >10K steps", emoji: "🏅" },
        { value: "unsure", label: "I'm not sure", emoji: "🤷" }] },

    { id: "intro_lowdose", type: "info", image: "assets/28.webp",
      title: 'Myth: "You need to be flexible to do Tai Chi"',
      body: "Surprisingly, this common belief stops many people from even trying Tai Chi workouts.\n\n**Chair Tai Chi proves this wrong.** It's designed for all flexibility levels and helps you build strength, balance, and focus gradually — right from the comfort of your chair at home." },

    // like / dislike series (image card + 👎/😐/👍)
    { id: "ld_mobility", type: "single", section: "Activity", layout: "ld", cardImg: "assets/29.webp",
      q: "Like or dislike?", statement: "Stretching",
      options: [{ value: "dislike", label: "Dislike", emoji: "👎" }, { value: "neutral", label: "Neutral", emoji: "😐" }, { value: "like", label: "Like", emoji: "👍" }] },
    { id: "ld_breathing", type: "single", section: "Activity", layout: "ld", cardImg: "assets/30.webp",
      q: "Like or dislike?", statement: "Chair Lunge",
      options: [{ value: "dislike", label: "Dislike", emoji: "👎" }, { value: "neutral", label: "Neutral", emoji: "😐" }, { value: "like", label: "Like", emoji: "👍" }] },
    { id: "ld_balance", type: "single", section: "Activity", layout: "ld", cardImg: "assets/31.webp",
      q: "Like or dislike?", statement: "Upper body",
      options: [{ value: "dislike", label: "Dislike", emoji: "👎" }, { value: "neutral", label: "Neutral", emoji: "😐" }, { value: "like", label: "Like", emoji: "👍" }] },
    { id: "ld_strength", type: "single", section: "Activity", layout: "ld", cardImg: "assets/33a.webp",
      q: "Like or dislike?", statement: "Core strength",
      options: [{ value: "dislike", label: "Dislike", emoji: "👎" }, { value: "neutral", label: "Neutral", emoji: "😐" }, { value: "like", label: "Like", emoji: "👍" }] },

    { id: "projection_2", type: "info", projChart: true, headerTop: true,
      title: "You'll achieve your dream body even sooner than expected!",
      lead: "We predict you'll be..",
      predict: "<span class='hl'>{goal}kg</span> by {projdate}",
      chartCap: "*Based on Tai Motion members with a similar goal",
      body: "Next, tell us more about your lifestyle so we can help you hit your goal even more effectively." },

    // ===================== Lifestyle =====================
    { id: "tension", type: "single", section: "Lifestyle",
      q: "Do you ever feel mentally tense or on edge?",
      options: [{ value: "lots", label: "I feel that a lot lately", emoji: "😫" },
        { value: "some", label: "I have some ups and downs", emoji: "😐" },
        { value: "steady", label: "I feel mostly steady", emoji: "😌" }] },

    { id: "intro_stress", type: "info", stressChart: true, headerTop: true,
      title: "Reduce stress and cut anxiety by 42% just by doing Chair Tai Chi",
      body: "Just 20 minutes of Chair Tai Chi can lower cortisol and boost serotonin, improving **mood, focus, and emotional resilience.**\n\nSource: British Journal of Sports Medicine" },

    { id: "water", type: "single", section: "Lifestyle",
      q: "What is your daily water intake?", sub: "It's important to consume enough fluid when exercising",
      options: [{ value: "coffee", label: "I mainly drink coffee or tea", emoji: "☕" },
        { value: "low", label: "About 2 glasses", emoji: "💧" },
        { value: "mid", label: "2 to 6 glasses", emoji: "💦" },
        { value: "high", label: "More than 6 glasses", emoji: "🌊" }] },

    { id: "mood", type: "single", section: "Lifestyle",
      q: "How's your mood most days?",
      options: [{ value: "low", label: "Low—I often feel down or irritable", emoji: "🔴" },
        { value: "mixed", label: "Up and down—it depends on the day", emoji: "🟡" },
        { value: "steady", label: "Steady—I usually feel okay", emoji: "🟢" }] },

    { id: "intro_focus", type: "info", focusChart: true, headerTop: true,
      title: "Feel calmer and more focused in just 2 weeks",
      body: "Chair Tai Chi boosts brain circulation and improves energy balance — helping you feel **sharper, more motivated, and emotionally steady.**\n\nSource: Harvard Health Publishing" },

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
      title: "Chair Tai Chi can support better, deeper sleep",
      body: "Regular **Chair Tai Chi helps you fall asleep faster** and get deeper, more restorative sleep — so you wake up refreshed and ready for the day." },

    { id: "diet", type: "multi", section: "Lifestyle",
      q: "Are you currently following a specific dietary pattern?", sub: "Choose all that apply",
      options: [{ value: "no", label: "No", emoji: "🚫" }, { value: "lowcarb", label: "Low-carb", emoji: "🥗" }, { value: "veg", label: "Vegetarian", emoji: "🥦" },
        { value: "plant", label: "Fully plant-based", emoji: "🌱" }, { value: "pesc", label: "Pescatarian", emoji: "🍤" }, { value: "lactose", label: "Lactose-free", emoji: "🥛" },
        { value: "gluten", label: "Gluten-free", emoji: "🥖" }, { value: "keto", label: "Keto", emoji: "🥑" }, { value: "other", label: "Other", emoji: "🍽️" }] },

    { id: "produce", type: "single", section: "Lifestyle",
      q: "How's your fruit and vegetable intake?", sub: "Generally, how many fruit and veggies do you eat a day?",
      options: [{ value: "low", label: "None or a little", emoji: "🙅" },
        { value: "fair", label: "A fair bit", emoji: "🍎" },
        { value: "lots", label: "I might be a rabbit", emoji: "🥕" }] },

    { id: "intro_nutrition", type: "info", image: "assets/43b.jpg",
      title: "Support your metabolism for lasting results",
      body: "You'll also get a personalized nutrition plan that supports your energy, health, and long-term progress — **without strict diets or food restrictions.**" },

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

    { id: "intro_brain", type: "info", image: "assets/49c.jpg",
      title: "Chair Tai Chi may reduce Alzheimer's risk by up to 51%",
      body: "Regular Chair Tai Chi workouts keep your brain healthy by boosting circulation, sharpening memory, and protecting against cognitive decline \u2013 all crucial for **women over 40.**\n\nSource: Harvard Health Publishing" },

    // ===================== Health & Safety =====================
    { id: "medications", type: "single", section: "Lifestyle", sectionLabel: "Health & Safety",
      q: "Are you taking any medications?", sub: "Rest assured this information is for your safety.",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },

    { id: "mobility", type: "single", section: "Lifestyle", sectionLabel: "Health & Safety",
      q: "Do you have any physical or mobility restrictions we should know about?",
      sub: "Rest assured this information is for your safety.",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "na", label: "Prefer not to answer" }] },

    { id: "intro_safe", type: "info", image: "assets/52b.jpg",
      title: "Prioritizing your health and safety",
      body: "Always adapt movements to suit your body.\n\nWe recommend checking with your doctor or physical therapist before starting a new activity that may affect your physical wellbeing or overall health." },

    { id: "menopause", type: "single", section: "Lifestyle", femaleOnly: true,
      q: "Have you gone through menopause?", sub: "Hormonal changes can impact your metabolism and nutritional needs.",
      options: [{ value: "no", label: "No" }, { value: "going", label: "Going through it" },
        { value: "passed", label: "Already passed it" }, { value: "unsure", label: "Not sure" },
        { value: "na", label: "Prefer not to answer" }] },

    { id: "intro_menopause_weight", type: "info", image: "assets/57b.png", femaleOnly: true,
      title: "Weight loss at every stage of life",
      body: "Menopause can make losing weight harder — hormonal changes affect fat storage and insulin sensitivity. Chair Tai Chi and personalized nutrition can help with these changes.\n\nThis makes **weight loss** and **wellness goals** easier to achieve." },

    // ===================== Plan generation (mid-funnel loader) =====================
    { id: "loader", type: "loader", title: "Just a moment...", sub: "Getting things ready for you", per: 1600,
      cards: [
        { img: "assets/55_1d.jpg", text: "Created by women and for women!" },
        { img: "assets/55_2d.jpg", text: "We focus on understanding your body, not dieting" },
        { img: "assets/55_3d.jpg", text: "Our approach to weight loss is based on changing behavioral patterns" },
        { img: "assets/55_4d.jpg", text: "You'll gain control over emotional eating patterns (for good)" },
        { img: "assets/55_5d.jpg", text: "Just follow your personalized action plan to reach your goal" },
        { img: "assets/55_6d.jpg", text: "It only takes 5 minutes a day" },
        { img: "assets/55_7d.jpg", text: "If you mess up, that's okay too!" },
        { img: "assets/55_8d.jpg", text: "No one is perfect, and we all fall off the wagon" },
        { img: "assets/55_9d.jpg", text: "We'll help you get back on track" },
      ] },

    { id: "intro_goodhands", type: "info", image: "assets/56b.jpg",
      title: "You're in good hands. Join 1.8M happy women already getting results",
      body: "Let us take care of you while you take care of yourself. We're here for you all along the way." },

    { id: "intro_almost", type: "info", image: "assets/57c.jpg",
      title: "Almost done!",
      body: "You're moments away from discovering a personalized path to looking and feeling your best.\n\nLet's finish up by exploring what motivates you!" },

    // ===================== Almost there =====================
    { id: "main_reason", type: "multi", section: "Lifestyle", sectionLabel: "Almost there",
      q: "What's your main reason for wanting to get in shape?", sub: "Choose all that apply",
      options: [{ value: "confident", label: "Feel more confident in my body" },
        { value: "energetic", label: "Feel healthier and more energetic" },
        { value: "look", label: "Change how I look" }, { value: "clothes", label: "Fit in my clothes better" },
        { value: "other", label: "Other" }] },

    { id: "motivates", type: "multi", section: "Lifestyle", sectionLabel: "Almost there",
      q: "What motivates you to exercise?", sub: "Choose all that apply",
      options: [{ value: "health", label: "Improving health" }, { value: "immune", label: "Boosting immune system" },
        { value: "look", label: "Looking better" }, { value: "strength", label: "Building strength and endurance" },
        { value: "mood", label: "Managing stress / improving mood" },
        { value: "example", label: "Setting a positive example for others" }, { value: "other", label: "Other" }] },

    { id: "motivation_level", type: "single", section: "Lifestyle", sectionLabel: "Almost there",
      q: "Right now, how motivated are you to reach your happy weight?",
      options: [{ value: "ready", label: "I'm 100% ready" }, { value: "hopeful", label: "I'm pretty hopeful about it" },
        { value: "unsure", label: "I'm a bit unsure" }, { value: "easy", label: "I'm kinda taking it easy" }] },

    { id: "obstacles", type: "multi", section: "Lifestyle", sectionLabel: "Almost there",
      q: "What made it hard for you to stay motivated to exercise in the past?", sub: "Choose all that apply",
      options: [{ value: "results", label: "Didn't see noticeable results" },
        { value: "regain", label: "I'd lose weight, but gain it back" },
        { value: "noplan", label: "Didn't have a clear effective plan" },
        { value: "toohard", label: "Previous plans were too hard" },
        { value: "notime", label: "Didn't have the time to exercise" },
        { value: "coaching", label: "Ineffective coaching" },
        { value: "none", label: "I didn't face any obstacles" }, { value: "other", label: "Other" }] },

    { id: "intro_sustainable", type: "info", image: "assets/62.webp",
      title: "Why do people give up on their weight-loss efforts?",
      body: "That's exactly why our program focuses on small, sustainable changes to your lifestyle — so you can **transform how you feel and enjoy thriving health, for life.**" },

    { id: "explore", type: "multi", section: "Lifestyle", sectionLabel: "Almost there",
      q: "While we're customizing your journey, what else do you want to explore?",
      sub: "Our holistic approach goes beyond weight loss to improve your well-being, mood, and health.",
      options: [{ value: "energy", label: "Upping my energy levels" }, { value: "habits", label: "Cultivating healthy behaviors" },
        { value: "digestion", label: "Understand digestion" }, { value: "stress", label: "Reducing stress" },
        { value: "flex", label: "Improving flexibility" }, { value: "posture", label: "Getting better posture" },
        { value: "endurance", label: "Improving endurance" }, { value: "immune", label: "Boosting my immune system" }] },

    { id: "pace", type: "single", section: "Lifestyle", sectionLabel: "Almost there",
      q: "Your Chair Tai Chi plan is ready! How quickly do you want to get in shape?",
      options: [{ value: "fast", label: "As quickly as possible" }, { value: "slow", label: "Slow and steady does it" },
        { value: "between", label: "Somewhere between the two" }] },

    { id: "intro_paced", type: "info", image: "assets/65.webp",
      title: "Perfect — we adjusted your plan to match your pace!",
      body: "And it doesn't stop here — we'll keep adapting your personal plan as your body and activity level change throughout your journey." },

    { id: "intro_focus20", type: "info", image: "assets/66b.jpg",
      title: "Just 20 minutes of Chair Tai Chi boosts focus and brainpower",
      body: "It increases blood flow to your brain and helps **sharpen memory, improve focus, and support clearer thinking.**" },

    { id: "daypart", type: "single", section: "Lifestyle", sectionLabel: "Almost there",
      q: "When do you feel most “on” — morning or night?",
      options: [{ value: "morning", label: "Morning" }, { value: "night", label: "Night" }, { value: "depends", label: "It depends" }] },

    // ===================== Capture =====================
    { id: "loader_plan", type: "loader", title: "Creating your personalized action plan…",
      steps: ["Analyzing Body Parameters", "Activity Preferences", "Health & Safety", "Generating Your Action Plan"] },

    { id: "email", type: "email",
      title: "Enter your email to get your personal <span class='hl'>Chair Tai Chi Plan!</span>" },

    { id: "name", type: "name", title: "What's your name?" },

    { id: "goals", type: "goals" },
  ],
};
