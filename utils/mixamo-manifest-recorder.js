/*
 * Paste into the Mixamo console once per page load, then download animations
 * by hand. Each finished download is recorded as { savedName, description }.
 *
 *   mixamoRecorder.save()   downloads mixamo-manifest.json
 *   mixamoRecorder.clear()  forgets what was recorded
 *
 * Then run: node utils/rename-mixamo-downloads.mjs <dir> <dir>/mixamo-manifest.json --apply
 * The manifest is kept in localStorage, so it survives a reload.
 */
(() => {
  "use strict";

  const KEY = "mixamoRecorderManifest";
  const queue = [];

  const read = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const selectedDescription = () => {
    const li = [
      ...document.querySelectorAll(
        ".product.product-selected .product-description li",
      ),
    ].find((el) => /^\s*Description:/i.test(el.textContent));

    return li?.textContent.replace(/^\s*Description:\s*/i, "").trim() || "";
  };

  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.recorderTarget = `${method} ${url}`;

    return nativeOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    // The selected animation is the one being exported when Download is clicked.
    if (/^POST .*\/animations\/export/.test(this.recorderTarget || "")) {
      queue.push(selectedDescription());
    }

    this.addEventListener("load", () => {
      if (!this.responseURL.includes("/monitor")) {
        return;
      }

      try {
        const result = JSON.parse(this.responseText);

        if (result.status !== "completed" || !result.job_result) {
          return;
        }

        const disposition = new URL(result.job_result).searchParams.get(
          "response-content-disposition",
        );
        const savedName = /filename="([^"]+)"/.exec(disposition || "")?.[1];
        const description = queue.shift();

        if (!savedName || !description) {
          console.warn("Recorder: could not pair a download.", {
            savedName,
            description,
          });

          return;
        }

        localStorage.setItem(
          KEY,
          JSON.stringify([...read(), { savedName, description }]),
        );
        console.info(`Recorded: ${savedName} -> ${description}`);
      } catch (error) {
        console.warn("Recorder: could not read the monitor response.", error);
      }
    });

    return nativeSend.apply(this, args);
  };

  window.mixamoRecorder = {
    save() {
      const a = document.createElement("a");

      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(read(), null, 2)], {
          type: "application/json",
        }),
      );
      a.download = "mixamo-manifest.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    },

    clear() {
      localStorage.removeItem(KEY);
    },
  };

  console.info("Mixamo recorder ready. Entries so far:", read().length);
})();
