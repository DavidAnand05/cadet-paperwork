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
      { id: "phone", label: "Phone", keys: [E("PHONE")], hint: "DSN or full 10-digit commercial number." },
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
    "Complete Antiterrorism Level 1 training (JKO course JS-US007)",
    "Complete ISOPREP, if required in Section IV.C. of the FCG",
    "Complete SERE 100.2 training, if required (JKO course J3T-A-US1329)",
    "Receive a TT/IATP entry number, if required",
    "Complete any other requirements in Section IV.C. of the FCG",
    "Submit a theater or country clearance request in APACS, if required",
    "Enroll in STEP through the Department of State",
    "Check Department of State alerts and warnings for each destination; notify the commander of any posted",
    "Complete the CW OCONUS Force Protection and Emergency Travel Plan",
    "Receive the OSI foreign travel brief, if needed",
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

  window.FORM_DEFS = { esss, form99, checklist };

  /* ---------- OCONUS steps, from the CS-11 OCONUS Package Instruction Manual ---------- */
  window.OCONUS_STEPS = [
    { text: "Confirm your passport is valid through the end of your trip." },
    { text: "Check the Foreign Clearance Guide (FCG) for each destination. Read the special notices and Section IV, which tells you whether you need an APACS request.", link: "https://apacs.milcloud.mil/fcg/fcg.cfm", linkText: "Open the FCG" },
    { text: "If Section IV requires it, submit an APACS request: sign in, select Personnel Requester, then Create Personnel Request. Save a screenshot that shows Approved for your package. INDOPACOM destinations also need a TT/IATP number.", link: "https://apacs.milcloud.mil/", linkText: "Open APACS" },
    { text: "Enroll in the Department of State Smart Traveler Enrollment Program (STEP).", link: "https://step.state.gov/step/", linkText: "Open STEP" },
    { text: "Review Department of State alerts and travel advisories for each destination. Tell your commander about any that are posted.", link: "https://travel.state.gov/content/passports/en/alertswarnings.html", linkText: "Open travel advisories" },
    { text: "Complete the OSI foreign travel brief, if required. Call OSI Detachment 439 at 719-333-3305 or 719-333-3306, or email AFOSI.Det439.ForeignTravel@us.af.mil." },
    { text: "Fill out the CW Force Protection and Emergency Travel Plan below, and digitally sign Section E.2." },
    { text: "Complete Antiterrorism (AT) Level 1 training in JKO and save the certificate.", link: "https://jko.jten.mil/courses/AT-level1/launch.html", linkText: "Open JKO" },
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
      guide: "Fill the cadet, pass and location blocks. Fill the automobile and flight blocks only if they apply. Leave the approval boxes and signature for the AOC or AMT.",
      files: [{ label: "Load the blank Form 99", url: "assets/forms/afcw-imt-99.pdf", name: "Lastname_AFCW_Form_99_Request_to_Exceed_Limits_DDMONYYYY.pdf", def: "form99" }]
    },
    oconus: {
      name: "OCONUS travel package",
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
      source: "Get the blank AFCW IMT 10 from your squadron, then upload it below. To respond to a Form 10 you received, use Write a memorandum and choose Response to a Report of Conduct.",
      guide: "In the conduct narrative, state the facts in order: what happened, the date and time, other cadets involved and any corrective action. Cite the regulation and paragraph for each standard."
    },
    form174: {
      name: "AF Form 174, Record of Individual Counseling",
      source: "Download the blank form from the Air Force e-Publishing website, www.e-publishing.af.mil, then upload it below.",
      guide: "State the issue, the standard and what the member must do to meet it. Record the member's comments in their own words, and set a follow-up date."
    },
    own: {
      name: "Your own template",
      source: "Upload a fillable PDF or a Word file with marked blanks. Select How to make your own Word template for instructions.",
      guide: ""
    }
  };
})();
