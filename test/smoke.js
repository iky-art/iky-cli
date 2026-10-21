import { test } from "node:test";
import { ok } from "node:assert";
import { main } from "../src/cli.js";

test("modul cli.js diekspor dan main adalah fungsi", () => {
  ok(typeof main === "function", "main harus berupa fungsi");
});

test("jalankan menu info tanpa error", async () => {
  await main(["info"]);
  ok(true, "menu info menyelesaikan tanpa melempar");
});
