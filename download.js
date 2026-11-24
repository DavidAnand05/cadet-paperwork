/* Saves a generated file. On a normal website this is an ordinary browser download.
   Inside a claude.ai preview, downloads go through the host's save dialog. */
(function () {
  "use strict";
  window.saveFile = async function (blob, filename) {
    if (window.claude && typeof window.claude.use === "function") {
      const dl = await window.claude.use("downloads");
      if (dl) {
        try { await dl.save({ filename, data: blob }); return "saved"; }
        catch (e) {
          if (e && e.code === "declined") return "declined";
          throw new Error((e && e.message) || "The download was blocked.");
        }
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return "saved";
  };
})();
