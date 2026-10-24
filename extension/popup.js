const SITES = [
  "x.com", "twitter.com", "reddit.com", "facebook.com", "instagram.com",
  "linkedin.com", "threads.net", "threads.com", "bsky.app", "tumblr.com",
  "pinterest.com", "youtube.com", "news.ycombinator.com"
];

const box = document.getElementById("sites");
const on = document.getElementById("on");

chrome.storage.local.get(["on", "skip"], (s) => {
  let skip = s.skip || [];
  on.checked = s.on !== false;
  on.addEventListener("change", () => chrome.storage.local.set({ on: on.checked }));

  for (const site of SITES) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !skip.includes(site);
    input.addEventListener("change", () => {
      skip = input.checked ? skip.filter((x) => x !== site) : [...skip, site];
      chrome.storage.local.set({ skip });
    });
    label.append(site, input);
    box.append(label);
  }
});
