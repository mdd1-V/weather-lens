const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\jepp1\\Desktop\\Weather App\\public\\icons';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const baseDefs = `
    <!-- Beautiful 3D Lighting Filter -->
    <filter id="3dObj" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-opacity="0.25" result="drop" />
      <feOffset dx="0" dy="5" in="SourceAlpha" />
      <feGaussianBlur stdDeviation="3" result="offsetBlurTop" />
      <feComposite operator="out" in="SourceAlpha" in2="offsetBlurTop" result="inverseTop" />
      <feFlood flood-color="#ffffff" flood-opacity="0.9" result="colorTop" />
      <feComposite operator="in" in="colorTop" in2="inverseTop" result="highlight" />
      <feOffset dx="0" dy="-6" in="SourceAlpha" />
      <feGaussianBlur stdDeviation="4" result="offsetBlurBottom" />
      <feComposite operator="out" in="SourceAlpha" in2="offsetBlurBottom" result="inverseBottom" />
      <feFlood flood-color="#000000" flood-opacity="0.25" result="colorBottom" />
      <feComposite operator="in" in="colorBottom" in2="inverseBottom" result="shadow" />
      <feMerge>
        <feMergeNode in="drop" />
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="shadow" />
        <feMergeNode in="highlight" />
      </feMerge>
    </filter>

    <linearGradient id="cloudGrad" x1="0" y1="28" x2="0" y2="75" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#94a3b8" />
    </linearGradient>

    <radialGradient id="sunGrad" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="40%" stop-color="#eab308" />
      <stop offset="100%" stop-color="#b45309" />
    </radialGradient>

    <!-- Silver/Blue Moon Gradient -->
    <radialGradient id="moonGrad" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="60%" stop-color="#cbd5e1" />
      <stop offset="100%" stop-color="#64748b" />
    </radialGradient>

    <linearGradient id="dropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#7dd3fc" />
      <stop offset="60%" stop-color="#0ea5e9" />
      <stop offset="100%" stop-color="#1e3a8a" />
    </linearGradient>

    <linearGradient id="snowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </linearGradient>

    <linearGradient id="lightningGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>

    <path id="raindrop" d="M 0 -7 C 0 -7, 4 3, 4 5 A 4 4 0 0 1 -4 5 C -4 3, 0 -7, 0 -7 Z" />
    <circle id="snowflake" cx="0" cy="0" r="5" />
`;

const cloudGeo = `
  <g fill="url(#cloudGrad)" filter="url(#3dObj)">
    <circle cx="30" cy="60" r="15" />
    <circle cx="50" cy="50" r="22" />
    <circle cx="70" cy="60" r="15" />
    <rect x="30" y="55" width="40" height="20" />
  </g>
`;

const sunGeo = `
  <circle cx="65" cy="40" r="20" fill="url(#sunGrad)" filter="url(#3dObj)" />
`;

const moonGeo = `
  <path d="M 68 20 A 20 20 0 1 0 85 50 A 24 24 0 0 1 68 20 Z" fill="url(#moonGrad)" filter="url(#3dObj)" />
`;

const dropsGeo = `
  <g fill="url(#dropGrad)" filter="url(#3dObj)">
    <use href="#raindrop" transform="translate(30, 83) rotate(20) scale(0.55)" />
    <use href="#raindrop" transform="translate(35, 79) rotate(20) scale(0.65)" />
    <use href="#raindrop" transform="translate(40, 88) rotate(20) scale(0.5)" />
    <use href="#raindrop" transform="translate(45, 82) rotate(20) scale(0.6)" />
    <use href="#raindrop" transform="translate(51, 78) rotate(20) scale(0.7)" />
    <use href="#raindrop" transform="translate(56, 89) rotate(20) scale(0.55)" />
    <use href="#raindrop" transform="translate(62, 83) rotate(20) scale(0.65)" />
    <use href="#raindrop" transform="translate(67, 86) rotate(20) scale(0.5)" />
    <use href="#raindrop" transform="translate(72, 79) rotate(20) scale(0.6)" />
  </g>
`;

const snowGeo = `
  <g fill="url(#snowGrad)" filter="url(#3dObj)">
    <use href="#snowflake" transform="translate(35, 80) scale(0.8)" />
    <use href="#snowflake" transform="translate(45, 85) scale(1)" />
    <use href="#snowflake" transform="translate(55, 78) scale(0.9)" />
    <use href="#snowflake" transform="translate(65, 88) scale(0.7)" />
  </g>
`;

const lightningGeo = `
  <path d="M 55 50 L 40 75 L 50 75 L 45 95 L 65 65 L 55 65 Z" fill="url(#lightningGrad)" filter="url(#3dObj)" />
`;

const wrapSvg = (content) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${baseDefs}</defs>${content}</svg>`;

const makeIcons = (suffix, starGeo) => {
  const map = {
    'clear': 'clear',
    'unknown': 'clear',
    'partly-cloudy': 'clouds',
    'cloudy': 'clouds',
    'overcast': 'clouds',
    'fog': 'clouds',
    'drizzle': 'rain',
    'rain': 'rain',
    'heavy-rain': 'rain',
    'snow': 'snow',
    'heavy-snow': 'snow',
    'sleet': 'snow',
    'hail': 'snow',
    'thunderstorm': 'thunderstorm'
  };

  const templates = {
    'clear': `
      ${starGeo.replace('cx="65" cy="40"', 'cx="50" cy="50"').replace('r="20"', 'r="25"').replace('M 68 20 A 20 20 0 1 0 85 50 A 24 24 0 0 1 68 20 Z', 'M 50 15 A 30 30 0 1 0 80 60 A 35 35 0 0 1 50 15 Z')}
    `,
    'clouds': `
      ${starGeo}
      ${cloudGeo}
    `,
    'rain': `
      ${starGeo}
      ${dropsGeo}
      ${cloudGeo}
    `,
    'snow': `
      ${starGeo}
      ${snowGeo}
      ${cloudGeo}
    `,
    'thunderstorm': `
      <circle cx="65" cy="40" r="20" fill="#334155" filter="url(#3dObj)" />
      ${lightningGeo}
      ${cloudGeo}
    `
  };

  for (const [condition, templateKey] of Object.entries(map)) {
    fs.writeFileSync(path.join(dir, `${condition}-${suffix}.svg`), wrapSvg(templates[templateKey]));
  }
};

makeIcons('day', sunGeo);
makeIcons('night', moonGeo);

console.log("Dynamically generated 10 day/night 3D weather icons.");
