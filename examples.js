/* Finished example memorandums written to Tongue and Quill standards.
   All names are fictional. */
(function () {
  "use strict";
  const CADET = { first: "Taylor", mi: "R", last: "Morgan", cls: "C1C", sq: "11", title: "Cadet, CS-11" };

  const EXAMPLES = [
    {
      label: "Pass request",
      type: "request",
      state: {
        to: { kind: "sqcc", symbol: "CS-11/CC", symbolEdited: false },
        approval: { on: true, first: "Jordan", mi: "A", last: "Reyes", grade: "Maj", service: "USAF", title: "Commander, CS-11", titleEdited: false },
        me: CADET,
        date: "2026-11-30",
        subject: "Request for C1C and C2C Discretionary Passes, 2 December 2026",
        refs: ["AFCWI 36-3501, Cadet Standards and Duties, 1 August 2025"],
        paras: [
          { text: "I request approval of discretionary passes for all CS-11 C1C and C2C cadets in good standing on Wednesday, 2 December 2026, from 1830 until TAPS, to attend a squadron cohesion dinner in Colorado Springs." },
          { text: "The purpose of this event is squadron cohesion. The C1C and C2C classes lead CS-11, and time together outside the duty day builds the trust those classes need to lead the squadron through the end of the semester." },
          { text: "In accordance with Reference (a), paragraph 5.3.7, the Squadron Commander or Academy Military Trainer (AMT) approves discretionary passes. This request excludes C3C and C4C cadets, whose day pass period ends at academic call to quarters (ACQ) in accordance with Reference (a), Table 5.1." },
          { text: "All attendees will sign out on FalconNet and return by TAPS. Only cadets of legal drinking age will consume alcohol, and attendees will use wingmen and designated drivers. The undersigned will serve as Cadet-in-Charge and will confirm that all attendees have returned." }
        ],
        atts: []
      }
    },
    {
      label: "Response to a Report of Conduct",
      type: "response",
      state: {
        to: { kind: "sqcc", symbol: "CS-11/CC", symbolEdited: false },
        approval: { on: false, first: "", mi: "", last: "", grade: "Maj", service: "USAF", title: "Commander, CS-11", titleEdited: false },
        me: CADET,
        date: "2026-11-04",
        subject: "Response to AFCW IMT 10, Report of Conduct, Dated 2 November 2026",
        refs: ["AFCW IMT 10, Report of Conduct, 2 November 2026", "AFCWI 36-3501, Cadet Standards and Duties, 1 August 2025"],
        paras: [
          { text: "This memorandum responds to the Report of Conduct at Reference (a). The report alleges that on 28 October 2026 I (1) signed in 20 minutes late from a day pass and (2) did not sign out on FalconNet. I accept responsibility for the late sign-in. I respectfully contest the second allegation." },
          { text: "I address each allegation below." },
          { text: "Late sign-in. I returned 20 minutes after my pass expired. I did not plan enough time for traffic, and I make no excuse for it. On every future pass, I will plan to return at least 30 minutes early.", sub: true },
          { text: "FalconNet sign-out. I signed out on FalconNet at 1702, before I departed, as Reference (b), paragraph 5.4, requires. I attached a screenshot of the entry.", sub: true },
          { text: "I respectfully request that you remove the second allegation from Reference (a) and limit any sanction to the late sign-in." },
          { text: "I understand the standard expected of a C1C, and I am committed to meeting it." }
        ],
        atts: ["FalconNet sign-out screenshot, 28 October 2026"]
      }
    },
    {
      label: "Memorandum for record",
      type: "record",
      state: {
        to: { kind: "record", symbol: "", symbolEdited: false },
        approval: { on: false, first: "", mi: "", last: "", grade: "Maj", service: "USAF", title: "", titleEdited: false },
        me: CADET,
        date: "2026-11-16",
        subject: "Loss of Common Access Card",
        refs: [],
        paras: [
          { text: "On 15 November 2026 at approximately 1400, I discovered that my Common Access Card (CAC) was missing. I last used it at 1130 the same day to sign in to a computer in Fairchild Hall." },
          { text: "I took the following actions:" },
          { text: "At 1415, I searched Fairchild Hall and checked the lost and found. I did not find the card.", sub: true },
          { text: "At 1430, I reported the loss to my Academy Military Trainer (AMT) and the Squadron Commander.", sub: true },
          { text: "At 1500, I scheduled an appointment with the ID card office for 16 November 2026 to receive a replacement CAC.", sub: true },
          { text: "I will notify my chain of command when I receive the replacement CAC. The point of contact for this memorandum is the undersigned." }
        ],
        atts: []
      }
    },
    {
      label: "Event plan",
      type: "request",
      state: {
        to: { kind: "sqcc", symbol: "CS-11/CC", symbolEdited: false },
        approval: { on: true, first: "Jordan", mi: "A", last: "Reyes", grade: "Maj", service: "USAF", title: "Commander, CS-11", titleEdited: false },
        me: { first: "Casey", mi: "M", last: "Diaz", cls: "C4C", sq: "11", title: "Cadet, CS-11" },
        date: "2027-01-25",
        subject: "100s Weekend Room Decoration Plan",
        refs: ["AFCWI 36-3501, Cadet Standards and Duties, 1 August 2025"],
        paras: [
          { text: "I request approval to decorate C1C Taylor R. Morgan's room for 100s Weekend, 12 through 15 February 2027, to recognize the C1C class and boost its morale." },
          { text: "C4C Jordan P. Lee and I will decorate the room around two themes:" },
          { text: "C1C Morgan's favorite sports team.", sub: true },
          { text: "C1C Morgan's career field after graduation.", sub: true },
          { text: "We will use only items that do not damage the room and that meet the dormitory standards in Reference (a), Chapter 6:" },
          { text: "Streamers and balloons.", sub: true },
          { text: "Printed photos attached with painter's tape.", sub: true },
          { text: "Posters hung with removable hooks.", sub: true },
          { text: "We will remove every decoration by 1900 on 15 February 2027 and return the room to inspection standards." },
          { text: "Please direct any questions to the undersigned." }
        ],
        atts: []
      }
    },
    {
      label: "Character letter",
      type: "character",
      state: {
        to: { kind: "reviewing", symbol: "ALL REVIEWING AUTHORITIES", symbolEdited: false },
        approval: { on: false, first: "", mi: "", last: "", grade: "Maj", service: "USAF", title: "", titleEdited: false },
        me: { first: "Taylor", mi: "R", last: "Morgan", cls: "C1C", sq: "11", title: "Flight Commander, Alpha Flight" },
        date: "2026-11-23",
        subject: "Character Letter for C3C Casey M. Diaz",
        refs: [],
        paras: [
          { text: "I am C1C Taylor R. Morgan, Flight Commander of Alpha Flight, Cadet Squadron 11 (CS-11). I have led cadets for 3 years and now supervise 24 cadets. I was named the CS-11 Cadet of the Quarter for summer 2026." },
          { text: "I have known C3C Diaz since August 2025, when C3C Diaz joined Alpha Flight. Our contact is duty-related. As the flight commander, I observe C3C Diaz daily at formations, training and room inspections." },
          { text: "C3C Diaz is a dependable cadet who puts the flight first. In October 2026, C3C Diaz led weekly study sessions that helped four C4C cadets raise their grades. C3C Diaz volunteers each month at a Colorado Springs food bank and scored in the top 10 percent of the squadron on the fall fitness test. I am aware of the allegations against C3C Diaz. They do not match the cadet I have observed every day for more than a year." },
          { text: "I ask the reviewing authorities to weigh C3C Diaz's record of service and character. If you have any questions, contact me at 719-555-0142." }
        ],
        atts: []
      }
    }
  ];

  const box = document.getElementById("exampleButtons");
  EXAMPLES.forEach(ex => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn ghost"; b.textContent = ex.label;
    b.addEventListener("click", () => {
      if (window.MFRApp.hasDraft() && !b.dataset.armed) {
        b.dataset.armed = "1"; b.textContent = "Select again to replace your draft";
        setTimeout(() => { delete b.dataset.armed; b.textContent = ex.label; }, 4000);
        return;
      }
      delete b.dataset.armed; b.textContent = ex.label;
      window.MFRApp.loadExample(ex);
    });
    box.appendChild(b);
  });
})();
