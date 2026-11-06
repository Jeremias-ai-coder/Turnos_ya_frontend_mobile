const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const whiteSvgPath = path.resolve('Turnos_ya_frontend_web-main/public/assets/brand/logo-white.svg');
const colorSvgPath = path.resolve('Turnos_ya_frontend_web-main/public/assets/brand/logo-color.svg');

const whiteSvg = fs.readFileSync(whiteSvgPath, 'utf8');
const colorSvg = fs.readFileSync(colorSvgPath, 'utf8');

// HTML template with transparent background
function createHtml(svgContent, bg = 'transparent') {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: ${bg};
      width: 480px;
      height: 108px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    svg {
      width: 480px;
      height: 108px;
    }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;
}

const tmpWhiteHtml = path.resolve('scratch/tmp-logo-white.html');
const tmpColorHtml = path.resolve('scratch/tmp-logo-color.html');

fs.mkdirSync('scratch', { recursive: true });
fs.writeFileSync(tmpWhiteHtml, createHtml(whiteSvg), 'utf8');
fs.writeFileSync(tmpColorHtml, createHtml(colorSvg), 'utf8');

const targetMobileWhite = path.resolve('Turnos_ya_frontend_mobile-main/assets/brand/logo-white.png');
const targetMobileColor = path.resolve('Turnos_ya_frontend_mobile-main/assets/brand/logo-color.png');
const targetWebWhite = path.resolve('Turnos_ya_frontend_web-main/public/assets/brand/logo-white.png');
const targetWebColor = path.resolve('Turnos_ya_frontend_web-main/public/assets/brand/logo-color.png');

console.log('Rendering logo-white.png via Headless Edge...');
execSync(`"${edgePath}" --headless --disable-gpu --default-background-color=00000000 --window-size=480,108 --screenshot="${targetMobileWhite}" "file://${tmpWhiteHtml}"`);

console.log('Rendering logo-color.png via Headless Edge...');
execSync(`"${edgePath}" --headless --disable-gpu --default-background-color=00000000 --window-size=480,108 --screenshot="${targetMobileColor}" "file://${tmpColorHtml}"`);

// Copy to web public directory as well
fs.copyFileSync(targetMobileWhite, targetWebWhite);
fs.copyFileSync(targetMobileColor, targetWebColor);

console.log('Successfully generated new brand PNGs for mobile and web!');

