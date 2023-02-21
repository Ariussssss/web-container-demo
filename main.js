import { WebContainer } from "@webcontainer/api";
import { files } from "./files";
import "./style.css";

/** @type {import('@webcontainer/api').WebContainer}  */
let webcontainerInstance;

document.querySelector("#app").innerHTML = `
  <div class="container">
    <div class="editor">
      <textarea>I am a textarea</textarea>
    </div>
    <div class="preview">
      <iframe src="loading.html"></iframe>
    </div>
  </div>
`;

console.log("files", files);

async function installDependencies() {
  // Install dependencies
  const installProcess = await webcontainerInstance.spawn("npm", ["install"]);
  // Wait for install command to exit

  installProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        console.log(data);
      },
    })
  );
  return installProcess.exit;
}

/** @param {string} content*/

async function writeIndexJS(content) {
  await webcontainerInstance.fs.writeFile("/index.js", content);
}

window.addEventListener("load", async () => {
  const textareaEl = document.querySelector("textarea");
  textareaEl.value = files["index.js"].file.contents;
  // Call only once
  webcontainerInstance = await WebContainer.boot();
  await webcontainerInstance.mount(files);

  const packageJSON = await webcontainerInstance.fs.readFile(
    "package.json",
    "utf-8"
  );
  console.log(packageJSON);

  const exitCode = await installDependencies();
  if (exitCode !== 0) {
    throw new Error("Installation failed");
  }

  webcontainerInstance.spawn("npm", ["run", "start"]);

  // Wait for `server-ready` event
  webcontainerInstance.on("server-ready", (port, url) => {
    const iframeEl = document.querySelector("iframe");
    iframeEl.src = url;
    textareaEl.addEventListener("input", (e) => {
      writeIndexJS(e.currentTarget.value);
    });
  });
});
