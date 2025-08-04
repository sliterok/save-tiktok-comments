import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/background.ts", "src/content.ts", "src/popup.ts"],
  platform: "browser",
  bundle: true,
  outdir: "dist",
  format: "esm",
});
