let nodes = [];
let coords = {};
let canvas, ctx, img;
let animationFrameId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1) Load nodes & coords
  nodes  = await fetch('/static/Nodes.json').then(r => r.json());
  coords = await fetch('/static/coords.json').then(r => r.json());

  // 2) Populate dropdowns
  const startSel = document.getElementById('start');
  const endSel   = document.getElementById('end');
  nodes.forEach(n => {
    startSel.add(new Option(n, n));
    endSel.  add(new Option(n, n));
  });

  // 3) Setup canvas overlay
  img    = document.getElementById('campus-map');
  canvas = document.getElementById('map-canvas');
  ctx    = canvas.getContext('2d');
  img.onload = () => {
    // match the displayed size
    canvas.width  = img.clientWidth;
    canvas.height = img.clientHeight;
  };

  // 4) Bind button
  document.getElementById('find-button').addEventListener('click', getRoute);
  setLanguage('en');
});

async function getRoute() {
  const start = document.getElementById('start').value;
  const end   = document.getElementById('end').value;
  if (!start || !end) {
    return alert('Please select both a start and an end point.');
  }

  // Ask the backend for the distance-optimized path
  const res = await fetch('/get_path', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start, end, mode: 'distance' })
  });

  const result = await res.json();
  if (result.error) {
    return alert(result.error);
  }

  // Clear any old drawing & start the animation
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  animatePath(result.path, '#ed1a20');

  // Show metrics
  document.getElementById('metrics').innerHTML = `
    <p><strong>Shortest Path:</strong> ${result.primary} m &nbsp;|&nbsp; ${result.secondary} min</p>
  `;
}

function animatePath(path, color) {
  if (!path || path.length < 2) return;

  // Precompute scaled points
  const points = path.map(node => {
    const [x, y] = coords[node];
    return {
      x: x * (canvas.width  / img.naturalWidth),
      y: y * (canvas.height / img.naturalHeight)
    };
  });

  // Cancel any prior animation
  if (animationFrameId) cancelAnimationFrame(animationFrameId);

  ctx.lineWidth   = 2;
  ctx.strokeStyle = color;
  ctx.setLineDash([4, 8]);    // dot/gap pattern

  let offset = 0;
  function step() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineDashOffset = -offset;

    ctx.beginPath();
    points.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else         ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    offset = (offset + 1) % 100;            // controls speed
    animationFrameId = requestAnimationFrame(step);
  }
  step();
}

function setLanguage(lang) {
  const L = {
    en: { title:'Campus Navigation', start:'Start:', end:'Destination:', find:'Find Route' },
    ar: { title:'الملاحة في الحرم الجامعي', start:'البداية:',    end:'الوجهة:',      find:'اكتشف المسار' }
  }[lang];

  document.getElementById('title').innerText       = L.title;
  document.getElementById('start-label').innerText = L.start;
  document.getElementById('end-label').innerText   = L.end;
  document.getElementById('find-button').innerText = L.find;
}
