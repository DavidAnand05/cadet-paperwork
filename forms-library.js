/* Built-in forms: field labels, order and Tongue and Quill guidance.
   A definition also applies when a cadet uploads their own copy of the same form. */
(function () {
  "use strict";

  /* ---------- eSSS (AF Form 1768) ---------- */
  const E = n => "AF1768_unlocked/" + n + "[0]";
  const ACTIONS = ["Coord", "Appr", "Sig", "Info"];
  const routeRows = [];
  const left = [["TOONE", "ACTONE", "SIGRDTA"], ["TOONE_2", "ACTONE_2", "SIGRDTA_3"], ["TOONE_3", "ACTONE_3", "SIGRDTA_5"], ["TOONE_4", "ACTONE_4", "SIGRDTA_7"], ["TOONE_5", "ACTONE_5", "SIGRDTA_9"]];
  const right = [["TOTWO", "ACTTWO", "SIGRDB"], ["TOTWO_2", "ACTTWO_2", "SIGRDB_3"], ["TOTWO_3", "ACTTWO_3", "SIGRDB_5"], ["TOTWO_4", "ACTTWO_4", "SIGRDB_7"], ["TOTWO_5", "ACTTWO_5", "SIGRDB_9"]];
  left.concat(right).forEach(([to, act, sig], i) => {
    const n = i + 1;
    routeRows.push({ id: "to" + n, label: n + ". To", keys: [E(to)], row: n, hint: n === 1 ? "Office symbol, in the order the offices should act, such as CS-11/Exec." : "" });
    routeRows.push({ id: "act" + n, label: n + ". Action", keys: [E(act)], row: n, type: "choice", options: ACTIONS, hint: n === 1 ? "Coord for coordination, Appr for approval, Sig for signature, Info for information. Use one Appr or Sig per package." : "" });
    routeRows.push({ id: "sig" + n, label: n + ". Surname and grade", keys: [E(sig)], row: n, hint: n === 1 ? "The person who acts for that office, such as Reyes, Maj. They sign and date beside it." : "" });
  });

  const SUMMARY_GENERAL = [
    "1. PURPOSE:  State the request and the action you need from the approving official.",
    "",
    "2. BACKGROUND:  Give the facts and cite the regulation and paragraph that apply.",
    "",
    "3. DISCUSSION:  Explain the plan and how you will meet the standards. If there are options, list each with its pros and cons.",
    "",
    "4. VIEWS OF OTHERS:  N/A",
    "",
    "5. RECOMMENDATION:  State, in one sentence, the action you recommend the approving official take.",
    "",
    "",
    "FIRSTNAME M. LASTNAME, C1C, USAFA",
    "Duty Title, CS-11"
  ].join("\n");

  const SUMMARY_OCONUS = [
    "1. PURPOSE:  Request approval to travel to the locations outside the continental United States (OCONUS) listed below.",
    "",
    "2. BACKGROUND:  A cadet who travels OCONUS needs commander approval and must submit all documents required by the CW Foreign Travel Guide.",
    "",
    "3. DISCUSSION:  I request to travel to COUNTRY for REASON.",
    "",
    "a. Location:  COUNTRY",
    "b. Arrival:  DD Mmm YY",
    "c. Departure:  DD Mmm YY",
    "d. Alerts and warnings:  List each Department of State alert or warning, or write None.",
    "e. Familiarity with the country:  Describe your familiarity with the country.",
    "",
    "4. RECOMMENDATION:  Approve travel to COUNTRY as outlined above and in the attached package.",
    "",
    "",
    "FIRSTNAME M. LASTNAME, C1C, USAFA",
    "Duty Title, CS-11",
    "",
    "5 Attachments:",
    "1. Foreign Travel Checklist",
    "2. CW Force Protection and Emergency Travel Plan",
    "3. Detailed Travel Itinerary",
    "4. Antiterrorism Level 1 Certificate",
    "5. APACS Clearance Request Confirmation (if required)"
  ].join("\n");

  const esss = {
    title: "eSSS, Staff Summary Sheet (AF Form 1768)",
    output: "This form opens only in Adobe Acrobat or Adobe Reader. Browsers and Preview show a blank page.",
    fields: [
      { group: "Action officer" },
      { id: "surname", label: "Surname of action officer and grade", keys: [E("SURNAME")], hint: "Your grade and last name, such as C1C Morgan." },
      { id: "symbol", label: "Symbol", keys: [E("SYMBOL")], hint: "Your organization and office symbol, such as CS-11." },
      { id: "phone", label: "Phone", keys: [E("PHONE")], hint: "Defense Switched Network (DSN) or full 10-digit commercial number." },
      { id: "typist", label: "Typist's initials", keys: [E("FIELD1")] },
      { id: "suspense", label: "Suspense date", keys: [E("CalDt")], type: "isodate", hint: "Leave blank if there is no suspense." },
      { group: "Subject and date" },
      { id: "subject", label: "Subject", keys: [E("SUBJECT")], hint: "Use the same subject as the attached correspondence, in title case." },
      { id: "date", label: "Date", keys: [E("CalDtB")], type: "isodate", hint: "The date the package leaves your office." },
      { group: "Routing, in the order offices act" },
      ...routeRows,
      { group: "Summary" },
      { id: "summary", label: "Summary", keys: [E("SUMMARY")], type: "long", rows: 18,
        hint: "Replace the guidance after each heading. Number paragraphs as in a memorandum, keep it to one page and mention every attachment. Delete any heading that does not apply." }
    ],
    presets: {
      general: {
        to1: "CS-11/Exec", act1: "Coord", to2: "CS-11/AMT", act2: "Appr",
        symbol: "CS-11", subject: "Request for ", summary: SUMMARY_GENERAL
      },
      oconus: {
        to1: "CS-11/Exec", act1: "Coord", to2: "CS-11/AMT", act2: "Coord", to3: "CS-11/CC", act3: "Appr",
        symbol: "CS-11", subject: "OCONUS Travel Request for C1C Firstname M. Lastname", summary: SUMMARY_OCONUS
      }
    }
  };

  /* ---------- AFCW IMT 99 ---------- */
  const F = (base, i) => "topmostSubform[0].Page1[0]." + base + "[" + i + "]";
  const both = (base, a, b) => [F(base, a), F(base, b)];
  const form99 = {
    title: "AFCW IMT 99, Request to Exceed Limits / Special Pass",
    output: "The form has two identical copies on the page. One set of answers fills both.",
    skip: [/CheckBox1/, /SignatureField1/],
    fields: [
      { group: "Cadet" },
      { id: "name", label: "Name (Last, First, MI)", keys: both("TextField1", 0, 15), hint: "Last name, first name and middle initial, such as Morgan, Taylor R." },
      { id: "merit", label: "Merit lists", keys: both("TextField1", 1, 16), hint: "Merit lists you are on this semester, such as Dean's List, or None." },
      { group: "Pass" },
      { id: "start", label: "Start (date and time)", keys: both("DateField2", 0, 1), hint: "Day, month, year and time, such as 4 Dec 26 1600." },
      { id: "return", label: "Return (date and time)", keys: both("DateField1", 0, 1), hint: "Day, month, year and time, such as 6 Dec 26 1900." },
      { id: "taken", label: "Passes taken", keys: [F("TextField1", 32), F("TextField1", 30)] },
      { id: "authorized", label: "Passes authorized", keys: [F("TextField1", 33), F("TextField1", 31)] },
      { group: "Location" },
      { id: "address", label: "Address", keys: both("TextField1", 3, 18), type: "long", rows: 3 },
      { id: "phone", label: "Phone", keys: both("TextField1", 4, 19), hint: "A number where you can be reached, with area code." },
      { id: "others", label: "Other cadets", keys: both("TextField1", 2, 17), type: "long", rows: 3, hint: "Grade and name of each cadet traveling with you, such as C1C Smith, or None." },
      { group: "Automobile or transport" },
      { id: "vdate", label: "Date(s)", keys: both("DateField3", 0, 1) },
      { id: "make", label: "Make", keys: both("TextField1", 5, 20) },
      { id: "year", label: "Year", keys: both("TextField1", 9, 24) },
      { id: "color", label: "Color", keys: both("TextField1", 10, 25) },
      { id: "plate", label: "License number", keys: both("TextField1", 6, 21) },
      { id: "state", label: "State", keys: both("TextField1", 8, 23), hint: "Two-letter state abbreviation, such as CO." },
      { id: "owner", label: "Owner", keys: both("TextField1", 7, 22) },
      { group: "Flights" },
      { id: "dflight", label: "Departure flight number", keys: both("TextField1", 11, 26) },
      { id: "dairline", label: "Departure airline", keys: both("TextField1", 12, 27) },
      { id: "dtime", label: "Departure date and time", keys: both("DateField5", 0, 1), hint: "Such as 4 Dec 26 1835." },
      { id: "aflight", label: "Arrival flight number", keys: both("TextField1", 13, 28) },
      { id: "aairline", label: "Arrival airline", keys: both("TextField1", 14, 29) },
      { id: "atime", label: "Arrival date and time", keys: both("DateField4", 0, 1) }
    ]
  };

  /* ---------- OCONUS checklist ---------- */
  const ITEMS = [
    "Notify the commander that you are planning foreign travel",
    "Confirm you have a valid passport",
    "Review the FCG page for each destination and identify all Section I and Section IV requirements",
    "Complete all Section I requirements in the FCG",
    "Complete Antiterrorism Level 1 training in Joint Knowledge Online (JKO), course JS-US007",
    "Complete an isolated personnel report (ISOPREP), if required in Section IV.C. of the Foreign Clearance Guide (FCG)",
    "Complete Survival, Evasion, Resistance and Escape (SERE) 100.2 training, if required (JKO course J3T-A-US1329)",
    "Receive a TT/IATP entry number, if required",
    "Complete any other requirements in Section IV.C. of the FCG",
    "Submit a theater or country clearance request in the Aircraft and Personnel Automated Clearance System (APACS), if required",
    "Enroll in STEP through the Department of State",
    "Check Department of State alerts and warnings for each destination; notify the commander of any posted",
    "Complete the CW OCONUS Force Protection and Emergency Travel Plan",
    "Receive the Air Force Office of Special Investigations (OSI) foreign travel brief, if needed",
    "Submit the staff package to the approval authority"
  ];
  const checklist = {
    title: "CW Foreign Travel Request Checklist",
    output: "Initial and date each item, or write N/A in the initials block if it does not apply.",
    fields: ITEMS.flatMap((item, i) => [
      { group: (i + 1) + ". " + item },
      { id: "ini" + (i + 1), label: "Initials", keys: ["Initial When CompletedRow" + (i + 1)], hint: i === 0 ? "Your initials, or N/A." : "" },
      { id: "date" + (i + 1), label: "Date completed", keys: ["Date CompletedRow" + (i + 1)], type: "date", hint: i === 0 ? "Such as 23 Nov 26." : "" }
    ])
  };

  /* A set of checkboxes where only one should be marked. Each option names the box it marks. */
  const pick = (id, label, opts, hint) => ({ id, label, type: "pick", hint, options: opts.map(([l, k]) => ({ label: l, key: k })), keys: opts.map(o => o[1]) });

  /* ---------- AFCW IMT 10, Report of Conduct ---------- */
  const T = i => F("TextField1", i), D = i => F("DateField1", i), C = i => F("CheckBox1", i);
  const form10 = {
    title: "AFCW IMT 10, Report of Conduct",
    output: "The reporting official fills Sections I and II. The rest belongs to the cadet and the chain of command.",
    skip: [/SignatureField1/],
    fields: [
      { group: "Section I, personnel information" },
      { id: "cadet", label: "1. Cadet name (Last, First, MI)", keys: [T(2)], hint: "The cadet the report is about, such as Morgan, Taylor R." },
      { id: "sq", label: "2. Squadron", keys: [T(1)], hint: "Such as CS-11." },
      { id: "year", label: "3. Class year", keys: [T(0)], hint: "Such as 2028." },
      { id: "date", label: "4. Date", keys: [D(0)], type: "date", hint: "The date you write the report, such as 23 Nov 26." },
      { id: "ro", label: "5. Reporting official (Last, First, MI)", keys: [T(3)], hint: "Your name, such as Reyes, Jordan A." },
      { id: "grade", label: "6. Grade", keys: [T(5)], hint: "Such as C2C, Capt or MSgt." },
      { id: "org", label: "7. Organization and office symbol", keys: [T(4)], hint: "Such as CS-11 or AFCW/CHG." },
      pick("romfr", "8. Reporting official memorandum attached", [["Yes", C(0)], ["No", C(1)]], "Attach a memorandum when the narrative needs more room."),
      { group: "Section II, incident details" },
      { id: "narrative", label: "Conduct narrative", keys: [T(6)], type: "long", rows: 12,
        hint: "Put the bottom line first, then state the facts in order: who, what, when, where and why, other cadets involved and any corrective action taken. Cite the regulation and paragraph for each standard. For a positive Form 10, describe what the cadet did, the result and why it deserves recognition." },
      { group: "Section IV, cadet options (the cadet who receives the form)" },
      { id: "received", label: "1. Date received", keys: [D(11)], type: "date" },
      { id: "cinit", label: "2. Cadet initials", keys: [T(9)] },
      pick("cmfr", "3. Memorandum attached", [["Yes", C(3)], ["No", C(2)]], "You may attach a memorandum within 3 duty days. Use Write a memorandum and choose Response to a Report of Conduct."),
      { group: "Section III, initial processing (squadron use)" },
      { id: "login", label: "1. Log-in date", keys: [D(12)], type: "date" },
      { id: "ccf", label: "2. Squadron first sergeant initials", keys: [T(7)] },
      { id: "elinit", label: "3. Element leader or supervisor initials", keys: [T(8)] },
      { group: "Section V, chain-of-command recommendations" },
      ...[["el", "1. Element leader or supervisor", 10, 10], ["flt", "2. Cadet flight commander", 11, 9], ["ccc", "3. Cadet commander", 12, 8],
          ["sqaoc", "4. Squadron Air Officer Commanding (AOC)", 13, 7], ["gpaoc", "5. Group AOC", 14, 6], ["cw", "6. Cadet Wing", 15, 5]].flatMap(([id, l, t, d], i) => [
        { id: id + "Rec", label: l + ": recommendation and initials", keys: [T(t)], row: 100 + i, hint: i === 0 ? "A recommended sanction and initials, or None." : "" },
        { id: id + "Date", label: "Date", keys: [D(d)], type: "date", row: 100 + i }
      ]),
      { group: "Section VI, final processing" },
      { id: "dem", label: "1. Demerits", keys: [T(16)] },
      { id: "conf", label: "2. Confinements", keys: [T(17)] },
      { id: "pass", label: "3. Loss of pass privileges", keys: [T(18)] },
      { id: "tours", label: "4. Tours", keys: [T(19)] },
      { id: "pov", label: "5. Revoke privately owned vehicle privileges", keys: [T(20)] },
      { id: "aorg", label: "7. Organization of awarding official", keys: [T(21)] },
      { id: "awarded", label: "8. Date awarded", keys: [D(3)], type: "date" },
      { id: "counseled", label: "10. Date counseled by awarding official", keys: [D(2)], type: "date" },
      { group: "Section VII, final coordination" },
      { id: "ronote", label: "1. Date reporting official notified", keys: [D(4)], type: "date" },
      { id: "cwvvd", label: "3. Date CWVVD notified (category 3 and 4 offenses)", keys: [D(1)], type: "date" }
    ]
  };

  /* ---------- CW Form 724, Cadet Comprehensive Assessment Worksheet (feedback) ---------- */
  const B = s => "Check Box12.0.0." + s, R = s => B("1.1.5.1.2." + s);
  const RATINGS = ["Failed to meet", "Met some expectations", "Met all expectations", "Exceeded expectations"];
  const rate = (id, label, keys, hint) => pick(id, label, RATINGS.map((r, i) => [r, keys[i]]), hint);
  const Q = (id, label, key) => ({ id, label, keys: [key], type: "long", rows: 3 });
  const feedback = {
    title: "CW Form 724, Cadet Comprehensive Assessment Worksheet",
    output: "The rater fills Sections I through V before the session. The rater and ratee discuss Section VI together, and both sign after the session.",
    skip: [/^Signature/],
    fields: [
      { group: "I. Personal information (the ratee)" },
      { id: "name", label: "Name (Last, First MI)", keys: ["NAME"], hint: "Such as Morgan, Taylor R." },
      { id: "rank", label: "Class year and grade", keys: ["CLASS YEAR AND RANK"], hint: "Such as 2028, C3C." },
      { id: "unit", label: "Unit or organization", keys: ["UNITORGANIZATION"], hint: "Such as CS-11." },
      { group: "II. Type of assessment" },
      pick("type", "Type of assessment", [["Initial", R("0.1")], ["Mid-term", "Check Box15.0.0.0"], ["Follow-up", "Check Box15.0.1.0"], ["Ratee requested", "Check Box15.1.1.0"], ["Rater directed", "Check Box15.0.1.1"]],
        "Initial also marks Initial or Not-Rated on every performance measure, because the form links those boxes."),
      { group: "III. Job description" },
      { id: "duty", label: "1. Duty title", keys: ["1 DUTY TITLE"], hint: "Use the title in the Air Force Cadet Wing (AFCW) Classification Directory, such as Flight Commander." },
      { id: "semester", label: "2. Semester", keys: ["Dropdown1"], type: "choice", options: ["Fall Semester", "Spring Semester", "Summer Semester Period 1", "Summer Semester Period 2", "Summer Semester Period 3"] },
      { id: "duties", label: "3. Key duties, tasks and responsibilities", keys: ["Text1"], type: "long", rows: 4,
        hint: "Summarize the duty summary for the position in the Classification Directory, in 1 to 4 lines. Select Open the Classification Directory above to look it up." },
      { group: "IV. Performance measures" },
      rate("perf", "1. Duty performance", [B("1.1.0"), B("0.1.0"), B("1.0.0.0.0"), B("1.0.0.1.0")],
        "For initial feedback, choose Initial above and leave the ratings blank. For all other feedback, rate each measure."),
      { id: "c1", label: "Comments on duty performance", keys: ["Text2"], type: "long", rows: 3,
        hint: "For initial feedback, state your expectations. Otherwise, assess performance with specific examples and recommend improvements. Use active voice and short sentences." },
      rate("motiv", "2a. Intrinsically motivated", [B("1.1.1"), B("0.1.1"), B("1.0.0.0.1"), B("1.0.0.1.1")]),
      rate("know", "2b. Expert knowledge", [B("0.1.5.0.0"), B("1.0.0.0.5"), B("1.0.0.0.2"), B("1.0.0.1.2")]),
      rate("dev", "2c. Develops others", [B("0.1.5.1.1"), B("0.1.2"), B("1.0.0.0.3"), B("1.0.0.1.3")]),
      rate("police", "2d. Self-policing ethic", [B("0.1.5.0.1"), B("0.1.3"), B("1.0.0.0.4"), B("1.0.0.1.4")]),
      { id: "c2", label: "Comments on professionalism", keys: ["Text3"], type: "long", rows: 3 },
      rate("lead", "3. Leadership", [B("0.1.4"), B("1.1.2"), B("1.1.3"), B("1.1.4")]),
      rate("follow", "3a. Followership", [B("1.1.5.0.0"), B("1.1.5.0.5"), B("1.1.5.1.5"), B("1.1.5.1.4")]),
      rate("team", "3b. Teamwork", [R("0.0"), B("1.1.5.0.4"), B("1.1.5.0.3"), B("1.1.5.1.3")]),
      { id: "c3", label: "Comments on leadership", keys: ["Text4"], type: "long", rows: 3 },
      rate("char", "4. Character", [R("6.6"), R("6.5"), R("6.4"), R("5.6")]),
      rate("integ", "4a. Integrity", [R("5.5"), R("6.0"), R("6.3"), R("4.6")]),
      rate("service", "4b. Service before self", [R("6.2"), R("5.4"), R("5.3"), R("4.5")]),
      rate("excel", "4c. Excellence", [R("6.1"), R("5.2"), R("5.1"), R("5.0")]),
      { id: "c4", label: "Comments on character", keys: ["Text5"], type: "long", rows: 3 },
      { group: "V. Additional expectations" },
      { id: "addl", label: "Additional expectations", keys: ["Text15"], type: "long", rows: 5,
        hint: "Such as accountability, caring for others, communication, judgment, physical fitness or resilience. For initial feedback, state your expectations; otherwise, assess how well the ratee met them." },
      { group: "VI. Knowing your Airman (discuss during the session)" },
      Q("q1", "1. What expectations and goals do you have for your job?", "1 What expectations and goals do you have for your job what do you think the job entails"),
      Q("q2", "2. What potential challenges can you foresee?", "2 What potential challenges can you foresee"),
      Q("q3", "3. How do you think you are performing in the unit?", "3 How do you think you are performing in the unit"),
      Q("q4", "4. What are your goals for self-improvement? (Specific, measurable, actionable, realistic and timely)", "4 What are some of your goals for selfimprovement Goals should be Specific Measureable Actionable Realistic and Timely"),
      Q("q4a", "4a. What are your personal goals (school, fitness, relational)?", "4a What are your personal goals school fitness relational"),
      Q("q4b", "4b. How can I best support you in accomplishing your goals?", "4b How can I best support you in accomplishing your goals"),
      Q("q5", "5. Do you have stressors in your life? If so, what are your goals for reducing them? How can we help?", "5 Do you have stressors in your life If so what are your goals for reducing them How can we help"),
      Q("q6", "6. How would you define a good wingman, and how would you rate yourself as one? Do you have a wingman and at least one mentor?", "6 How would you define a good wingman  How would you rate yourself as a wingman Provide examples"),
      Q("q7", "7. Do you take part in any high-risk activities? Have you completed AF Form 4391? Have you had any mishaps?", "7 Do you have Wingmen  Do you have at least one mentor"),
      Q("q8", "8. Would you like to offer any suggestions or feedback (unit improvements, safety, productivity, programs, living conditions)?", "8 Would you like to offer any suggestionsfeedback eg unit improvements safety productivity programs living conditions"),
      Q("q9", "9. Expectations for the unit and ratee (strengths, areas for improvement, recommendations)", "9 Expectations for unit and ratee areas for improvement strengths and weaknesses recommendations for improvement"),
      { group: "Signatures" },
      { id: "date", label: "Date", keys: ["DATE"], type: "date", hint: "The date of the session, such as 23 Nov 26. The ratee and rater sign with their Common Access Card (CAC) after the session." }
    ]
  };

  /* ---------- AF Form 174, Record of Individual Counseling (guidance from the CS-11 template) ---------- */
  const form174 = {
    title: "AF Form 174, Record of Individual Counseling",
    output: "The counselor fills Sections II and III. The counselee fills Section IV. Leave Sections V and VI for the commander.",
    skip: [/^Signature/],
    fields: [
      { group: "II. Personal data (the cadet being counseled)" },
      { id: "name", label: "1. Name (Last, First, MI)", keys: ["1NAMELast First MI"], hint: "Such as Morgan, Taylor R." },
      { id: "grade", label: "2. Grade", keys: ["2GRADE"], hint: "Such as C3C or C4C." },
      { id: "ssn", label: "3. Social Security number (SSN)", keys: ["3SSN"], hint: "Write a dash (-). Never put an SSN on this form." },
      { id: "afsc", label: "4. AFSC", keys: ["4AFSC"], hint: "Cadets have no Air Force Specialty Code (AFSC); write a dash (-)." },
      { id: "phone", label: "5. Duty phone", keys: ["5DUTYPHONE"], hint: "Write a dash (-) unless the cadet has a duty phone." },
      { id: "unit", label: "6. Unit and office symbol", keys: ["6UNITOFFICESYMBOL"], hint: "Such as CS-11. During Basic Cadet Training (BCT), write BCT/ and your element." },
      { id: "reason", label: "7. Reason for counseling", keys: ["7REASONFORCOUNSELING"], type: "long", rows: 2, hint: "Why you are writing the Form 174, in a few words, such as Late to formation." },
      { id: "other", label: "8. Other information", keys: ["8OTHERINFORMATION ie marital status course graduation date date assigned etc"], hint: "Write a dash (-) if nothing applies." },
      { group: "III. Counseling" },
      { id: "summary", label: "9. Summary of counseling", keys: ["9SUMMARYOFCOUNSELING Give details facts specific dates times names sequence of events etc"], type: "long", rows: 10,
        hint: "State who, what, when and where. Add a sentence on why the counseling is necessary. Then describe the session, such as: On 23 November 2026 we discussed the cadet's late arrival to formation. I told the cadet that the squadron expects a C3C to arrive 5 minutes early." },
      { id: "advice", label: "10. Recommendations and advice of counselor", keys: ["10RECOMMENDATIONSANDADVICEOFCOUNSELOR"], type: "long", rows: 6,
        hint: "Write the plan the counselee and you agreed on to correct the behavior: what each of you will do and by when." },
      { id: "counselor", label: "11. Name, grade and duty title of counselor", keys: ["11NAMEGRADEANDDUTYTITLEOFCOUNSELOR"], type: "long", rows: 2, hint: "Such as Jordan A. Reyes, C2C, Element Leader." },
      { id: "date1", label: "13. Date", keys: ["13DATE"], type: "date", hint: "The date of the session, such as 23 Nov 26. Sign block 12 with your Common Access Card (CAC)." },
      { group: "IV. Acknowledgment of counseling (the counselee)" },
      { id: "comments", label: "14. Summary of counselee's comments", keys: ["14SUMMARYOFCOUNSELEESCOMMENTS Indicate if none"], type: "long", rows: 6,
        hint: "The counselee writes anything they want here; hand them the form to type it. Write None if the counselee has no comments." },
      { id: "counselee", label: "15. Name and grade of counselee", keys: ["15NAMEANDGRADEOFCOUNSELEE"], hint: "Such as Taylor R. Morgan, C3C. The counselee signs block 16." },
      { id: "date2", label: "17. Date", keys: ["17DATE"], type: "date" },
      { group: "V and VI. Referral and commander's comments (commander use)" },
      { id: "referral", label: "18. Referral agencies recommended", keys: ["18REFERRALAGENCIESRECOMMENDED Personal Affairs Chaplain Legal Assistance Medical Social Actions Red Cross etc"], type: "long", rows: 2, hint: "Leave blank; the commander fills Sections V and VI." },
      { id: "cc", label: "Commander's comments", keys: ["COMMANDERS COMMENTS VIRow1"], type: "long", rows: 3 },
      { id: "ccname", label: "19. Name and grade of commander", keys: ["19NAMEANDGRADEOFCOMMANDER"] },
      { id: "date3", label: "21. Date", keys: ["21DATE"], type: "date" }
    ]
  };

  window.FORM_DEFS = { esss, form99, checklist, form10, feedback, form174 };

  /* ---------- OCONUS steps, from the CS-11 OCONUS Package Instruction Manual ---------- */
  window.OCONUS_STEPS = [
    { text: "Confirm your passport is valid through the end of your trip." },
    { text: "Check the Foreign Clearance Guide (FCG) for each destination. Read the special notices and Section IV, which tells you whether you need an Aircraft and Personnel Automated Clearance System (APACS) request.", link: "https://apacs.milcloud.mil/fcg/fcg.cfm", linkText: "Open the FCG" },
    { text: "If Section IV requires it, submit an APACS request: sign in, select Personnel Requester, then Create Personnel Request. Save a screenshot that shows Approved for your package. U.S. Indo-Pacific Command (INDOPACOM) destinations also need a TT/IATP number.", link: "https://apacs.milcloud.mil/", linkText: "Open APACS" },
    { text: "Enroll in the Department of State Smart Traveler Enrollment Program (STEP).", link: "https://step.state.gov/step/", linkText: "Open STEP" },
    { text: "Review Department of State alerts and travel advisories for each destination. Tell your commander about any that are posted.", link: "https://travel.state.gov/content/passports/en/alertswarnings.html", linkText: "Open travel advisories" },
    { text: "Complete the Air Force Office of Special Investigations (OSI) foreign travel brief, if required. Call OSI Detachment 439 at 719-333-3305 or 719-333-3306, or email AFOSI.Det439.ForeignTravel@us.af.mil." },
    { text: "Fill out the CW Force Protection and Emergency Travel Plan below, and digitally sign Section E.2." },
    { text: "Complete Antiterrorism (AT) Level 1 training in Joint Knowledge Online (JKO) and save the certificate.", link: "https://jko.jten.mil/courses/AT-level1/launch.html", linkText: "Open JKO" },
    { text: "Fill out the eSSS, the Foreign Travel Checklist and the Detailed Itinerary below." },
    { text: "Combine the eSSS, checklist, Force Protection Plan, itinerary, FCG Sections I and IV, AT Level 1 certificate, any other certificates and the APACS confirmation into one PDF Portfolio. Send it to the squadron executive by the deadline." }
  ];
  window.OCONUS_NOTES = [
    "Hawaii, Alaska and other U.S. territories outside the continental United States count as OCONUS.",
    "Routing depends on the Department of State advisory level. Level 2 or below: the eSSS ends at the Squadron Commander, who signs Force Protection Plan Section E, Block 3. Level 3: route through the Group 2 Antiterrorism Representative to the Group Commander, who signs Section E, Block 3. Level 4: route through Group to the Cadet Wing Commander; the Group Commander signs Section E, Block 3 and the Cadet Wing Commander signs Block 4.",
    "The itinerary must list every flight (airport, flight number, airline, departure and arrival times), driving plans with stops and hotels, any cruise details, transportation from the airport and each place you will stay (name, dates, address and phone).",
    "Driving limits, AFCWI 36-3501, paragraph 3.1.6.2: if you performed duty the day you leave, drive no more than 6 hours with one driver or 12 hours with two or more. If you did not, the limits are 8 hours for one driver, 12 for two and 16 for three or more. Stop driving at 2400 Mountain Standard Time and rest at least 8 hours before you continue."
  ];

  /* ---------- Library shown in Fill a form ---------- */
  window.FORM_LIBRARY = {
    esss: {
      name: "eSSS, Staff Summary Sheet (AF Form 1768)",
      source: "Use the blank eSSS below, or upload your own copy.",
      guide: "Tongue and Quill, Chapter 18: the summary captures the whole package so the approving official can act. Use the headings Purpose, Background, Discussion, Views of Others and Recommendation, and number paragraphs as in a memorandum.",
      files: [{ label: "Load the blank eSSS", url: "assets/forms/af1768-esss.pdf", name: "eSSS_Lastname_DDMONYYYY.pdf", def: "esss", preset: "general" }]
    },
    form99: {
      name: "AFCW IMT 99, Request to Exceed Limits / Special Pass",
      source: "Use the blank Form 99 below, or upload your own copy.",
      guide: "Fill the cadet, pass and location blocks. Fill the automobile and flight blocks only if they apply. Leave the approval boxes and signature for the Air Officer Commanding (AOC) or Academy Military Trainer (AMT).",
      files: [{ label: "Load the blank Form 99", url: "assets/forms/afcw-imt-99.pdf", name: "Lastname_AFCW_Form_99_Request_to_Exceed_Limits_DDMONYYYY.pdf", def: "form99" }]
    },
    oconus: {
      name: "OCONUS travel package",
      // Paused: set to false to turn the package back on. Its forms, steps and eSSS preset stay in place.
      disabled: true,
      note: "Not available yet. The OCONUS travel package will return in a future update.",
      source: "Fill each form below in turn, then combine them with your certificates into one PDF Portfolio in Adobe Acrobat. Start at least 30 to 60 days before travel.",
      guide: "",
      oconus: true,
      files: [
        { label: "1. eSSS for OCONUS travel", url: "assets/forms/af1768-esss.pdf", name: "1. Lastname_OCONUS_eSSS.pdf", def: "esss", preset: "oconus" },
        { label: "2. Foreign Travel Checklist", url: "assets/forms/oconus-checklist.pdf", name: "2. Lastname_OCONUS_Checklist.pdf", def: "checklist" },
        { label: "3. Force Protection Plan", url: "assets/forms/oconus-force-protection-plan.pdf", name: "3. Lastname_OCONUS_Force Protection Plan.pdf" },
        { label: "4. Detailed Itinerary", url: "assets/forms/oconus-itinerary.pdf", name: "4. Lastname_OCONUS_Detailed Itinerary.pdf" }
      ]
    },
    form10: {
      name: "Form 10, Report of Conduct",
      source: "Use the blank AFCW IMT 10 below for a positive or a negative report, or upload your own copy. To respond to a Form 10 you received, use Write a memorandum and choose Response to a Report of Conduct.",
      guide: "As the reporting official, fill Sections I and II. In the conduct narrative, state the facts in order: what happened, the date and time, other cadets involved and any corrective action. Cite the regulation and paragraph for each standard. Leave the later sections for the cadet and the chain of command.",
      files: [{ label: "Load the blank Form 10", url: "assets/forms/afcw-imt-10.pdf", name: "Lastname_AFCW_Form_10_DDMONYYYY.pdf", def: "form10" }]
    },
    feedback: {
      name: "Feedback worksheet (CW Form 724)",
      source: "Use the blank Cadet Comprehensive Assessment Worksheet below for initial, mid-term or follow-up feedback, or upload your own copy. For the duty title and key duties, look up the position in the Air Force Cadet Wing (AFCW) Classification Directory.",
      guide: "Fill Sections I through V before the session. For initial feedback, state your expectations; for all other feedback, assess performance with specific examples. Discuss Section VI with the ratee, then both of you sign.",
      files: [{ label: "Load the blank feedback worksheet", url: "assets/forms/cw-form-724-feedback.pdf", name: "FEEDBACK_LASTNAME_SEMESTER.pdf", def: "feedback" }],
      links: [{ label: "Open the Classification Directory (reference)", url: "assets/forms/afcw-classification-directory.pdf" }]
    },
    form174: {
      name: "AF Form 174, Record of Individual Counseling",
      source: "Use the blank Form 174 below for general counseling, either positive or corrective. You can also upload your own copy.",
      guide: "State the issue, the standard and what the cadet must do to meet it. Record the cadet's comments in their own words. When both of you have signed, send the Form 174 to the squadron first sergeant.",
      files: [{ label: "Load the blank Form 174", url: "assets/forms/af-form-174.pdf", name: "Lastname_AF_Form_174_DDMONYYYY.pdf", def: "form174" }]
    },
    own: {
      name: "Your own template",
      source: "Upload a fillable PDF or a Word file with marked blanks. Select How to make your own Word template for instructions.",
      guide: ""
    }
  };
})();
