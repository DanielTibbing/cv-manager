// Generates electron/icon.png (1024×1024) for the Electron bundle. A stylized
// resume page: white rounded sheet, blue banner with "CV", photo circle and
// text lines, in the app's slate/blue palette. Re-run when tweaking the icon.
import fs from "node:fs";
import { createCanvas } from "@napi-rs/canvas";

const S = 1024;
const canvas = createCanvas(S, S);
const ctx = canvas.getContext("2d");

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function line(x, y, w, h, color) {
  roundedRect(x, y, w, h, h / 2);
  ctx.fillStyle = color;
  ctx.fill();
}

const PAGE = { x: 76, y: 56, w: 872, h: 912, r: 190 };

// Sheet with a soft drop shadow.
ctx.save();
ctx.shadowColor = "rgba(15, 23, 42, 0.25)";
ctx.shadowBlur = 36;
ctx.shadowOffsetY = 14;
roundedRect(PAGE.x, PAGE.y, PAGE.w, PAGE.h, PAGE.r);
ctx.fillStyle = "#ffffff";
ctx.fill();
ctx.restore();

// Everything below is clipped to the sheet.
roundedRect(PAGE.x, PAGE.y, PAGE.w, PAGE.h, PAGE.r);
ctx.clip();

// Banner.
ctx.fillStyle = "#2563eb";
ctx.fillRect(PAGE.x, PAGE.y, PAGE.w, 330);

// "CV" on the banner.
ctx.fillStyle = "#ffffff";
ctx.font = '700 190px "Helvetica Neue", Arial, sans-serif';
ctx.textBaseline = "alphabetic";
ctx.fillText("CV", PAGE.x + 96, PAGE.y + 240);

// Photo circle overlapping the banner edge, with a simple person glyph.
const PHOTO = { cx: PAGE.x + 218, cy: PAGE.y + 330 + 62, r: 104 };
ctx.beginPath();
ctx.arc(PHOTO.cx, PHOTO.cy, PHOTO.r, 0, Math.PI * 2);
ctx.fillStyle = "#ffffff";
ctx.fill();
ctx.beginPath();
ctx.arc(PHOTO.cx, PHOTO.cy, PHOTO.r - 14, 0, Math.PI * 2);
ctx.fillStyle = "#e2e8f0";
ctx.fill();
// head + shoulders
ctx.fillStyle = "#94a3b8";
ctx.beginPath();
ctx.arc(PHOTO.cx, PHOTO.cy - 22, 34, 0, Math.PI * 2);
ctx.fill();
ctx.beginPath();
ctx.arc(PHOTO.cx, PHOTO.cy + 62, 52, Math.PI, 0);
ctx.closePath();
ctx.fill();

// Headline lines next to the photo.
line(PAGE.x + 380, PAGE.y + 396, 380, 40, "#cbd5e1");
line(PAGE.x + 380, PAGE.y + 462, 280, 30, "#e2e8f0");

// Body text lines.
const BODY = ["#e2e8f0", "#e2e8f0", "#e2e8f0", "#e2e8f0"];
const widths = [700, 560, 660, 420];
widths.forEach((w, i) => {
  line(PAGE.x + 96, PAGE.y + 590 + i * 86, w, 34, BODY[i]);
});

fs.writeFileSync("electron/icon.png", canvas.toBuffer("image/png"));
console.log("Wrote electron/icon.png");
