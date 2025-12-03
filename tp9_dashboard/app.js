// app.js — simple dashboard loading CSVs from ../data and computing requested stats

const dataPath = "../data/"; // use forward slashes for browser fetch URLs

async function loadCsv(name){
  const res = await fetch(dataPath + name);
  const txt = await res.text();
  // schedule parsing on the next macrotask so the browser can paint the overlay
  return await new Promise((resolve)=> setTimeout(()=> resolve(d3.csvParse(txt)), 0));
}

async function init(){
  // --- DÉBUT BLOC À COLLER ---
  const startLights = (function(){
    let overlay = null, lights = [], goText = null, cycleTimer = null, loadedFlag = false;
    
    function create(){
      // Création HTML dynamique
      overlay = document.createElement('div'); overlay.className = 'start-overlay';
      const box = document.createElement('div'); box.className = 'start-box';
      const lightsWrap = document.createElement('div'); lightsWrap.className = 'start-lights';
      
      for(let i=0;i<5;i++){ 
          const l = document.createElement('div'); l.className='light'; 
          lightsWrap.appendChild(l); lights.push(l); 
      }
      
      goText = document.createElement('div'); goText.className = 'go-text'; goText.textContent = 'GO!';
      const sub = document.createElement('div'); sub.className = 'loading-sub'; sub.textContent = 'Chargement des données...';
      
      box.appendChild(lightsWrap); box.appendChild(goText); box.appendChild(sub);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    }

    function lightStep(i = 0){
        if(i < 5){
            // Allume une lumière rouge
            lights[i].classList.add('on');
            cycleTimer = setTimeout(() => lightStep(i+1), 1000); // Délai 1 seconde
        } else {
            // Toutes allumées, on attend les données
            waitForData();
        }
    }

    function waitForData(){
        if(loadedFlag){
            // Si les données sont là, on lance le vert
            setTimeout(doGo, 500); 
        } else {
            // Sinon on continue d'attendre
            cycleTimer = setTimeout(waitForData, 200);
        }
    }

    function doGo(){
      // Extinction des feux rouges
      lights.forEach(l => l.classList.remove('on'));
      if(goText){
        // Affichage du GO vert
        goText.classList.add('visible', 'go-green', 'flash');
        // On enlève l'écran après un court délai
        setTimeout(()=>{
            overlay.classList.add('hidden');
            setTimeout(() => { if(overlay) overlay.remove(); }, 500);
        }, 800);
      }
    }

    return { 
        start: function(){ if(!overlay) create(); overlay.classList.remove('hidden'); loadedFlag = false; lightStep(0); }, 
        markLoaded: function(){ loadedFlag = true; } 
    };
  })();

  // Lancer l'animation tout de suite
  startLights.start();
  // --- FIN BLOC À COLLER ---

  // position spinner under header and show it while CSVs load
  try{ if(typeof positionSpinner === 'function') positionSpinner(); } catch(e){}
  try{ window.addEventListener('resize', ()=>{ try{ positionSpinner(); }catch(e){} }); } catch(e){}
  try{ showSpinner(); } catch(e){}

  // allow the browser to paint the overlay before we begin the potentially busy fetch/parse work
  // double rAF gives the browser a chance to layout & paint the newly-inserted DOM
  try{ await new Promise(res=> requestAnimationFrame(()=> requestAnimationFrame(res))); } catch(e){ /* fallback no-op */ }
  const [drivers, constructors, races, results, circuits, qualifying, pit_stops, lap_times] = await Promise.all([
    loadCsv('drivers.csv'),
    loadCsv('constructors.csv'),
    loadCsv('races.csv'),
    loadCsv('results.csv'),
    loadCsv('circuits.csv'),
    loadCsv('qualifying.csv'),
    loadCsv('pit_stops.csv'),
    loadCsv('lap_times.csv')
  ]);

  // signal that data is ready so startLights will play final GO and hide
  try{ startLights.markLoaded(); } catch(e){ /* ignore */ }

  // Helpers
  const find = (arr, key, id) => arr && arr.find(x => String(x[key]) === String(id));
  const getName = (row, table) => {
    if(!row) return 'Inconnu';
    if(table === 'drivers') return ((row.forename || '') + ' ' + (row.surname || '')).trim();
    if(table === 'constructors') return row.name || 'Inconnu';
    return String(row);
  }

  // global UI state
  const state = { mode: 'driver', circuitId: null, year: null };

  // read palette from CSS variables so charts match brand
  const css = window.getComputedStyle(document.documentElement);
  const accent = (css.getPropertyValue('--accent') || '#e10600').trim();
  const dark = (css.getPropertyValue('--dark') || '#15151e').trim();
  const panel = (css.getPropertyValue('--panel') || '#ffffff').trim();
  const muted = (css.getPropertyValue('--muted') || '#666666').trim();
  // fallback palette with brand accent first
  const palette = [accent, '#2b8cc4', '#6aa0d8', '#4caf50', '#f39c12', '#9b59b6', dark, '#95a5a6', '#f1c40f', '#ff6b6b'];

  // small reusable bar chart drawer
  function drawBarChart(svgSelector, data, {labelKey='name', valueKey='value', top=10} = {}){
    const svg = d3.select(svgSelector);
    svg.selectAll('*').remove();
    svg.attr('overflow','visible');
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;

    // use only the visible slice (top N) for sizing and scales so axis adapts to displayed values
    const visible = (data && data.slice(0, top)) || [];

    // compute a dynamic right margin to avoid clipping (we keep some padding but labels will be inside bars)
    const maxVal = d3.max(visible, d => +d[valueKey]) || 0;
    const approxCharWidth = 9; // approximate pixels per digit/char for label sizing
    const valLabelWidth = String(maxVal).length * approxCharWidth + 16; // padding around number
    // compute left margin based on actual rendered label widths to avoid left overflow
    let maxLabelPx = 0;
    try{
      const meas = svg.append('g').attr('class','_label-measure').attr('visibility','hidden');
      visible.forEach(v => {
        const txt = String(v[labelKey] || '');
        const t = meas.append('text').style('font-size','12px').style('font-family', 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif').text(txt);
        const wTxt = t.node().getComputedTextLength();
        if(wTxt > maxLabelPx) maxLabelPx = wTxt;
        t.remove();
      });
      meas.remove();
    } catch(e){
      // fallback to character estimate on any error
      const maxLabelLen = d3.max(visible, d => String(d[labelKey] || '').length) || 0;
      maxLabelPx = maxLabelLen * approxCharWidth;
    }
    // keep left margin reasonable: at least 70px for label room, but not more than 40% of svg width
    const computedLeftPx = Math.ceil(maxLabelPx) + 24;
    const leftMargin = Math.min(Math.max(70, computedLeftPx), Math.floor(width * 0.4));
    const margin = {top:20,right: Math.max(12, valLabelWidth),bottom:40,left:leftMargin};

    const w = Math.max(50, width - margin.left - margin.right);
    const h = Math.max(50, height - margin.top - margin.bottom);

    const g = svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);
    // domain based on visible values and add small padding (5%) so the largest bar doesn't touch the axis end
    const maxVisible = Math.max(1, d3.max(visible, d => +d[valueKey]) || 1);
    const x = d3.scaleLinear().range([0,w]).domain([0, maxVisible * 1.05]);
    const y = d3.scaleBand().range([0,h]).domain(data.slice(0,top).map(d=>d[labelKey])).padding(0.1);

    // helper: generate shades from base color towards white (used when a team colour is active)
    function generateShades(base, n){
      try{
        const interp = d3.interpolateRgb(base, '#ffffff');
        const maxT = 0.66; // how far to go towards target (0..1)
        if(n <= 1) return [base];
        return Array.from({length:n}, (_,i)=> interp((i/(n-1)) * maxT));
      } catch(e){ return Array.from({length:n}, (_,i)=> palette[i % palette.length]); }
    }

    // color scale for bars based on labels
    let color;
    // use team colour shades when a specific driver or constructor is selected
    if(state && (state.driverId || state.constructorId)){
      const computed = window.getComputedStyle(document.documentElement);
      const base = (computed.getPropertyValue('--accent') || palette[0]).trim();
      const n = Math.max(1, visible.length);
      const shades = generateShades(base, n);
      color = d3.scaleOrdinal().domain(visible.map(d=>d[labelKey])).range(shades);
    } else {
      color = d3.scaleOrdinal().domain(data.map(d=>d[labelKey])).range(palette);
    }

    const bars = g.append('g').selectAll('rect').data(data.slice(0,top)).join('rect')
      .attr('y', d=>y(d[labelKey]))
      .attr('height', y.bandwidth())
      .attr('x',0)
      .attr('width', d=>x(d[valueKey]))
      .attr('fill', d=>color(d[labelKey]));

    // render y axis
    const yAxisG = g.append('g').call(d3.axisLeft(y));
    yAxisG.selectAll('text').style('font-size','12px').style('fill', dark).each(function(d){
      const node = this;
      const full = String(d || '');
      // if the rendered text is wider than available left margin, truncate with ellipsis
      const maxAllowed = Math.max(20, leftMargin - 24); // safe area inside left margin
      if(node.getComputedTextLength() > maxAllowed){
        let txt = full;
        // progressively truncate
        while(node.getComputedTextLength() > maxAllowed && txt.length>0){
          txt = txt.slice(0,-1);
          node.textContent = txt + '…';
        }
        // set native tooltip with full label
        node.setAttribute('title', full);
      }
    });
    g.append('g').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x).ticks(5)).selectAll('text').style('fill', muted);

    // labels: always placed inside the bar, right-aligned
    const labels = g.selectAll('.label').data(data.slice(0,top)).join('text')
      .attr('y', d=> y(d[labelKey]) + y.bandwidth()/2 + 4)
      .text(d=>d[valueKey])
      .style('font-size','11px')
      .attr('text-anchor','end');

    // set x and contrasting color based on bar fill
    labels.each(function(d){
      const sel = d3.select(this);
      const barWidth = x(d[valueKey]);
      // position 6px from the right edge of the bar
      const xPos = Math.max(6, barWidth - 6);
      sel.attr('x', xPos);

      // determine contrasting text color from bar fill
      const barFill = color(d[labelKey]);
      const c = d3.color(barFill) || d3.color('#000');
      const lum = (c.r * 0.299 + c.g * 0.587 + c.b * 0.114);
      const textColor = lum < 140 ? '#ffffff' : dark;
      sel.style('fill', textColor);
    });
  }

  // pie chart drawer
  function drawPieChart(svgSelector, data, {labelKey='name', valueKey='value', top=8} = {}){
    const svg = d3.select(svgSelector);
    svg.selectAll('*').remove();
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;
    const radius = Math.min(width, height) / 2 - 10;
    const g = svg.append('g').attr('transform', `translate(${width/2},${height/2})`);

    // sort and keep top, aggregate rest
    const sorted = data.slice().sort((a,b)=>b[valueKey]-a[valueKey]);
    const topData = sorted.slice(0, top);
    const others = sorted.slice(top).reduce((s,d)=>s + (d[valueKey]||0), 0);
    if(others > 0) topData.push({id:'other', name:'Autres', value: others});

    const pie = d3.pie().value(d=>d[valueKey]).sort(null);
    const arcs = pie(topData);
    // color scale using site palette or team shades when a team is selected
    let color;
    if(state && (state.driverId || state.constructorId)){
      try{
        const computed = window.getComputedStyle(document.documentElement);
        const base = (computed.getPropertyValue('--accent') || palette[0]).trim();
        const n = Math.max(1, topData.length);
        const interp = d3.interpolateRgb(base, '#ffffff');
        const maxT = 0.66;
        const shades = Array.from({length:n}, (_,i)=> interp((i/(n-1||1)) * maxT));
        color = d3.scaleOrdinal().domain(topData.map(d=>d[labelKey])).range(shades);
      } catch(e){ color = d3.scaleOrdinal().domain(topData.map(d=>d[labelKey])).range(palette); }
    } else {
      color = d3.scaleOrdinal().domain(topData.map(d=>d[labelKey])).range(palette);
    }

    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const path = g.selectAll('path').data(arcs).join('path')
      .attr('d', arc)
      .attr('fill', d=>color(d.data[labelKey]))
      .attr('stroke', panel)
      .attr('stroke-width', 1)
      .on('mouseenter', function(event,d){
        const txt = `${d.data[labelKey]} : ${d.data[valueKey]}`;
        tooltip.style('display','block').html(txt);
      })
      .on('mousemove', function(event){ tooltip.style('left', (event.clientX+12)+'px').style('top', (event.clientY+12)+'px'); })
      .on('mouseleave', function(){ tooltip.style('display','none'); });

    // legend rendered as a separate DOM element under the chart container to avoid overlapping
    const container = d3.select(svgSelector).node().parentNode;
    let legendDiv = d3.select(container).select('.legend');
    if(!legendDiv.node()) legendDiv = d3.select(container).append('div').attr('class','legend');
    // populate legend
    legendDiv.html('');
    const items = legendDiv.selectAll('.legend-item').data(topData).join('div').attr('class','legend-item');
    items.append('span').attr('class','legend-swatch').style('background', d=>color(d[labelKey]));
    items.append('span').attr('class','legend-label').html(d=>`${d[labelKey]} (${d[valueKey]})`).style('color', dark);
  }

  // bubble (scatter) chart drawer
  function drawBubbleChart(svgSelector, data, {xKey='count', yKey='value', rKey='count', labelKey='name', top=60} = {}){
    const svg = d3.select(svgSelector);
    svg.selectAll('*').remove();
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;
    const margin = {top:20,right:10,bottom:40,left:60};
    const w = Math.max(50, width - margin.left - margin.right);
    const h = Math.max(50, height - margin.top - margin.bottom);

    // group used for axes (keeps axis coordinates simple)
    const g = svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);

    const plot = data.slice(0, top).filter(d=>d[yKey]!=null && d[xKey]!=null);
    if(plot.length===0) return;

    const x = d3.scaleLinear().domain([0, d3.max(plot, d=>+d[xKey])]).range([0,w]).nice();
    const y = d3.scaleLinear().domain([d3.max(plot,d=>+d[yKey]), d3.min(plot,d=>+d[yKey])]).range([h,0]).nice();
    const r = d3.scaleSqrt().domain([d3.min(plot,d=>+d[rKey]), d3.max(plot,d=>+d[rKey])]).range([6,28]);

    // axes
    g.append('g').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x)).selectAll('text').style('fill', muted);
    g.append('g').call(d3.axisLeft(y)).selectAll('text').style('fill', muted);

    // color scale
    // color scale: when a team colour is active, use shades of the team colour
    let color;
    if(state && (state.driverId || state.constructorId)){
      const computed = window.getComputedStyle(document.documentElement);
      const base = (computed.getPropertyValue('--accent') || palette[0]).trim();
      const n = Math.max(1, plot.length);
      const interp = d3.interpolateRgb(base, '#ffffff');
      const maxT = 0.66;
      const shades = Array.from({length:n}, (_,i)=> interp((i/(n-1||1)) * maxT));
      color = d3.scaleOrdinal().domain(plot.map(d=>d[labelKey])).range(shades);
    } else {
      color = d3.scaleOrdinal().domain(plot.map(d=>d[labelKey])).range(palette);
    }

    // defs for clipPaths
    const defs = svg.append('defs');

    // simple in-memory cache for avatar fetch results
    const avatarCache = {};

    // persistent cache across reloads (localStorage) to avoid repeated fetch attempts
    const persistentCacheKey = 'f1_headshot_cache_v1';
    let persistentCache = {};
    try{ persistentCache = JSON.parse(localStorage.getItem(persistentCacheKey) || '{}'); } catch(e){ persistentCache = {}; }

    // helper: apply team color to dashboard theme (updates CSS var and palette[0])
    function applyTeamColour(teamColour){
      if(!teamColour) return;
      let hex = String(teamColour).replace('#','').trim();
      if(!/^[0-9a-fA-F]{6}$/.test(hex)) return; // ignore invalid
      hex = '#'+hex.toLowerCase();
      try{ document.documentElement.style.setProperty('--accent', hex); } catch(e){}
      // update in-memory palette first color so charts pick it up on next draw
      try{ palette[0] = hex; } catch(e){}
      // trigger a re-render so charts pick up the new colour immediately
      try{ setTimeout(()=>{ if(typeof updateAll === 'function') updateAll(); }, 0); } catch(e){}
    }

    // function to request local headshot server to fetch and save headshot
    async function requestLocalServerFetch(driverId){
      try{
        const url = `http://localhost:8001/fetch_headshot?driverId=${encodeURIComponent(driverId)}`;
        const resp = await fetch(url);
        if(!resp.ok) return false;
        const j = await resp.json();
        return j.status === 'saved' || j.status === 'exists';
      } catch(e){ return false; }
    }

    // resolve a headshot url by checking local files under data/headshots/<driverId> first
    async function resolveHeadshotLocal(driverId){
      if(!driverId) return null;
      const base = dataPath + 'headshots/' + driverId;
      const candidates = [base + '.jpg', base + '.png', base + '.jpeg', base + '.webp'];
      for(const url of candidates){
        try{
          // try HEAD first
          const r = await fetch(url, {method:'HEAD'});
          if(r.ok) return url;
        } catch(e){ /* ignore */ }
      }
      // if not found, ask local server to fetch it (best-effort)
      const tried = await requestLocalServerFetch(driverId);
      if(tried){
        // small delay to allow file to be written by server
        await new Promise(res=>setTimeout(res, 350));
        for(const url of candidates){
          try{ const r = await fetch(url, {method:'HEAD'}); if(r.ok) return url; } catch(e){}
        }
      }
      return null;
    }

    // fetch driver metadata (headshot url + team colour) from OpenF1 API or fallbacks
    async function tryFetchOpenF1Image(driverId, driverRef, driverNumber, driverName){
      const cacheKey = driverId || driverRef || driverName || null;
      // return from persistent cache if present (could be null for negative)
      if(cacheKey && persistentCache[cacheKey] !== undefined){
        return persistentCache[cacheKey]; // object or null
      }

      async function fetchFromApi(queryUrl){
        try{
          const resp = await fetch(queryUrl, {mode: 'cors'});
          if(!resp.ok) return null;
          const data = await resp.json();
          if(Array.isArray(data) && data.length){
            const item = data[0];
            if(item){
              return { url: item.headshot_url || null, teamColour: item.team_colour || null };
            }
          }
        } catch(e){ /* ignore */ }
        return null;
      }

      // try by driver number
      if(driverNumber && String(driverNumber) !== '' && String(driverNumber) !== "\\N"){
        const url = `https://api.openf1.org/v1/drivers?driver_number=${encodeURIComponent(driverNumber)}&session_key=latest`;
        const res = await fetchFromApi(url);
        if(res){ if(cacheKey) { persistentCache[cacheKey]=res; try{ localStorage.setItem(persistentCacheKey, JSON.stringify(persistentCache)); }catch(e){} } return res; }
      }

      // try by full name
      if(driverName){
        const url = `https://api.openf1.org/v1/drivers?full_name=${encodeURIComponent(driverName)}&session_key=latest`;
        const res = await fetchFromApi(url);
        if(res){ if(cacheKey) { persistentCache[cacheKey]=res; try{ localStorage.setItem(persistentCacheKey, JSON.stringify(persistentCache)); }catch(e){} } return res; }
      }

      // fallback heuristics for static image URLs
      const candidates = [];
      if(driverId) {
        candidates.push(`https://api.openf1.io/drivers/${driverId}/image`);
        candidates.push(`https://openf1.io/images/drivers/${driverId}.jpg`);
        candidates.push(`https://openf1.io/images/drivers/${driverId}.png`);
        candidates.push(`https://cdn.openf1.io/drivers/${driverId}.jpg`);
      }
      if(driverRef){
        candidates.push(`https://openf1.io/drivers/${driverRef}.jpg`);
        candidates.push(`https://openf1.io/drivers/${driverRef}.png`);
        candidates.push(`https://api.openf1.io/drivers/by-ref/${driverRef}/image`);
      }

      for(const url of candidates){
        try{
          const resp = await fetch(url, {mode: 'cors'});
          if(!resp.ok) continue;
          const ct = resp.headers.get('content-type') || '';
          if(!ct.startsWith('image/')) continue;
          const obj = { url, teamColour: null };
          if(cacheKey){ persistentCache[cacheKey] = obj; try{ localStorage.setItem(persistentCacheKey, JSON.stringify(persistentCache)); }catch(e){} }
          return obj;
        } catch(e){ /* ignore */ }
      }

      // negative cache
      if(cacheKey){ persistentCache[cacheKey] = null; try{ localStorage.setItem(persistentCacheKey, JSON.stringify(persistentCache)); }catch(e){} }
      return null;
    }

    // helper to unwrap a cached meta (string or object) into a url string
    function metaToUrl(m){
      if(!m) return null;
      if(typeof m === 'string') return m;
      if(typeof m === 'object' && m.url) return m.url;
      return null;
    }

    // compute absolute positions and create clipped avatar images
    for(let i=0;i<plot.length;i++){
      const d = plot[i];
      const cx = margin.left + x(+d[xKey]);
      const cy = margin.top + y(+d[yKey]);
      const rp = Math.max(3, Math.round(r(+d[rKey])));
      const clipId = `avatar-clip-${i}`;
      // create clipPath in userSpaceOnUse so we can use absolute coords
      defs.append('clipPath').attr('id', clipId).attr('clipPathUnits', 'userSpaceOnUse')
        .append('circle').attr('cx', cx).attr('cy', cy).attr('r', rp);

      // group all bubble elements so we can bring the whole bubble to front on hover
      const bubbleG = svg.append('g').attr('class', 'bubble').style('pointer-events', 'auto');

      // draw background immediately (will be made transparent later if headshot found)
      const bgCircle = bubbleG.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', rp)
        .attr('fill', color(d[labelKey]))
        .attr('opacity', 0.95);

      // prepare initials for generated avatar
      const name = String(d[labelKey] || '');
      const parts = name.split(/\s+/).filter(Boolean);
      let initials = parts.length ? parts.map(p=>p[0]).slice(0,2).join('') : name.slice(0,2);
      initials = initials.toUpperCase();

      // contrasting text color for avatar label
      const c = d3.color(color(d[labelKey])) || d3.color('#000');
      const lum = (c.r * 0.299 + c.g * 0.587 + c.b * 0.114);
      const txtColor = lum < 140 ? '#ffffff' : '#111';

      // generate SVG avatar as data URL (initials fallback)
      const svgAvatar = `<?xml version="1.0" encoding="UTF-8"?>` +
        `<svg xmlns='http://www.w3.org/2000/svg' width='${rp*2}' height='${rp*2}' viewBox='0 0 ${rp*2} ${rp*2}'>` +
        `<rect width='100%' height='100%' fill='${color(d[labelKey])}' />` +
        `<text x='50%' y='50%' font-family='Segoe UI, Tahoma, Geneva, Verdana, sans-serif' font-size='${Math.max(10, Math.round(rp*0.9))}' fill='${txtColor}' dominant-baseline='middle' text-anchor='middle'>${initials}</text></svg>`;
      const dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgAvatar);

      // append image and clip it (start with initials)
      const img = bubbleG.append('image')
        .attr('href', dataUrl)
        .attr('x', cx - rp).attr('y', cy - rp).attr('width', rp*2).attr('height', rp*2)
        .attr('clip-path', `url(#${clipId})`)
        .style('cursor', 'pointer')
        .on('mouseenter', function(event){
          // bring this bubble (group) to front so it's not hidden by others
          try{ bubbleG.raise(); } catch(e){}
          const txt = `${d[labelKey]}\nCount: ${d[xKey]}\nBest: ${d[yKey]} ms`;
          tooltip.style('display','block').html(txt.replace(/\n/g,'<br/>'));
        })
        .on('mousemove', function(event){ tooltip.style('left', (event.clientX+12)+'px').style('top', (event.clientY+12)+'px'); })
        .on('mouseleave', function(){ tooltip.style('display','none'); });

      // add a subtle border (contour de bulle) above the image
      bubbleG.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', rp)
        .attr('fill', 'none')
        .attr('stroke', '#000')
        .attr('stroke-width', Math.max(1, Math.round(rp*0.08)));

      // check for local headshot asynchronously; if found replace image and make bg transparent
      resolveHeadshotLocal(d.id).then(localHead => {
        if(localHead){
          try{ img.attr('href', localHead); bgCircle.attr('fill','none'); } catch(e){}
        }
      }).catch(()=>{});

      // asynchronously try to fetch real driver photo via OpenF1 and replace if found (non-blocking)
      (async ()=>{
        try{
          const id = d.id || null;
          // try to find driverRef from drivers dataset (available in outer scope)
          const drvRow = id ? find(drivers, 'driverId', id) : null;
          const driverRef = drvRow ? (drvRow.driverRef || drvRow.code || drvRow.url || null) : null;
          const cacheKey = id || driverRef || name;
          if(avatarCache[cacheKey]){
            // previously resolved: either string URL or object {url, teamColour}
            const cached = avatarCache[cacheKey];
            const cachedUrl = metaToUrl(cached);
            if(cachedUrl){ img.attr('href', cachedUrl); try{ if(String(cachedUrl || '').startsWith(dataPath+'headshots/')) bgCircle.attr('fill','none'); } catch(e){} }
            // if cached team colour and this pilot is the selected one, apply theme
            const tc = (typeof cached === 'object' && cached && cached.teamColour) ? cached.teamColour : null;
            if(tc && state.driverId && String(state.driverId)===String(id)) applyTeamColour(tc);
            return;
          }

          const meta = await tryFetchOpenF1Image(id, driverRef, drvRow ? drvRow.number : null, name);
          if(meta && meta.url){
            avatarCache[cacheKey] = meta;
            const murl = metaToUrl(meta);
            if(murl) img.attr('href', murl);
            try{ if(String(murl).startsWith(dataPath+'headshots/')) bgCircle.attr('fill','none'); } catch(e){}
            if(meta.teamColour && state.driverId && String(state.driverId)===String(id)) applyTeamColour(meta.teamColour);
          } else {
            // mark negative cache to avoid re-trying repeatedly
            avatarCache[cacheKey] = null;
          }
        } catch(e){
          // ignore errors and keep initials
        }
      })();
    }

    // axis labels (kept as before)
    svg.append('text').attr('x', margin.left + w/2).attr('y', height-4).attr('text-anchor','middle').text('Nombre de pitstops (observés)').style('fill', muted);
    svg.append('text').attr('transform', 'rotate(-90)').attr('x', - (margin.top + h/2)).attr('y', 12).attr('text-anchor','middle').text('Meilleur pit (ms)').style('fill', muted);
  }

  // compute aggregated data according to state.mode and optional circuit filter
  function computeStandings(){
    const yearFilteredRaces = state.year ? races.filter(r=>String(r.year)===String(state.year)).map(r=>r.raceId) : races.map(r=>r.raceId);
    // base filter by year and circuit
    let filteredResults = results.filter(rs=>yearFilteredRaces.includes(rs.raceId) && (!state.circuitId || String((races.find(rr=>rr.raceId===rs.raceId)||{}).circuitId) === String(state.circuitId)));
    // if a driver filter is selected, narrow to that driver
    if(state.driverId){ filteredResults = filteredResults.filter(r=>String(r.driverId) === String(state.driverId)); }
    // if a constructor filter is selected, narrow to that constructor
    if(state.constructorId){ filteredResults = filteredResults.filter(r=>String(r.constructorId) === String(state.constructorId)); }

    if(state.mode === 'driver'){
      const resultsByDriver = d3.rollup(filteredResults, v=>v.length, d=>d.driverId);
      return Array.from(resultsByDriver, ([id,count])=>({id, name: getName(find(drivers,'driverId',id),'drivers'), value:count})).sort((a,b)=>b.value-a.value);
    }
    // constructor mode (default)
    const resultsByConstructor = d3.rollup(filteredResults, v=>v.length, d=>d.constructorId);
    return Array.from(resultsByConstructor, ([id,count])=>({id, name: getName(find(constructors,'constructorId',id),'constructors'), value:count})).sort((a,b)=>b.value-a.value);
  }

  function computeWinsByCircuit(){
    const yearRaceIds = state.year ? races.filter(r=>String(r.year)===String(state.year)).map(r=>r.raceId) : races.map(r=>r.raceId);
    const raceList = state.circuitId ? races.filter(r=>String(r.circuitId)===String(state.circuitId) && yearRaceIds.includes(r.raceId)).map(r=>r.raceId) : yearRaceIds;
    let filtered = results.filter(rs=>raceList.includes(rs.raceId));
    // apply entity filters
    if(state.driverId) filtered = filtered.filter(r=>String(r.driverId) === String(state.driverId));
    if(state.constructorId) filtered = filtered.filter(r=>String(r.constructorId) === String(state.constructorId));
    const wins = filtered.filter(r=>r.position==='1');

    if(state.mode === 'driver'){
      const winsByDriver = d3.rollup(wins, v=>v.length, d=>d.driverId);
      return Array.from(winsByDriver, ([id,count])=>({id, name:getName(find(drivers,'driverId',id),'drivers'), value:count})).sort((a,b)=>b.value-a.value);
    }
    // constructor mode
    const winsByCons = d3.rollup(wins, v=>v.length, d=>d.constructorId);
    return Array.from(winsByCons, ([id,count])=>({id, name:getName(find(constructors,'constructorId',id),'constructors'), value:count})).sort((a,b)=>b.value-a.value);
  }

  function computeRecords(){
    // fastest lap by circuit -> aggregate to entity depending on mode and year
    const fastestByCircuit = {};
    lap_times.forEach(l=>{
      const race = races.find(r=>r.raceId===l.raceId);
      if(!race) return;
      if(state.year && String(race.year) !== String(state.year)) return;
      if(state.circuitId && String(race.circuitId) !== String(state.circuitId)) return;
      const cid = race.circuitId;
      const ms = l.milliseconds ? +l.milliseconds : null;
      if(ms==null) return;
      if(!fastestByCircuit[cid] || ms < fastestByCircuit[cid].ms) fastestByCircuit[cid] = {ms, driverId: l.driverId, raceId: l.raceId};
    });
    const rows = [];
    Object.entries(fastestByCircuit).forEach(([cid,rec])=>{
      const circuit = circuits.find(c=>String(c.circuitId)===String(cid));
      if(!circuit) return;
      if(state.mode === 'driver'){
        // if driver filter present, only include circuits matching that driver
        if(state.driverId && String(rec.driverId) !== String(state.driverId)) return;
        rows.push({name: circuit.name, value: rec.ms, sub: getName(find(drivers,'driverId',rec.driverId),'drivers')});
      } else {
        // constructor mode: find constructor for that driver in that race using results
        const resRow = results.find(r=>String(r.raceId)===String(rec.raceId) && String(r.driverId)===String(rec.driverId));
        const consId = resRow ? resRow.constructorId : null;
        if(state.constructorId && String(consId) !== String(state.constructorId)) return;
        rows.push({name: circuit.name, value: rec.ms, sub: getName(find(constructors,'constructorId',consId),'constructors')});
      }
    });
    return rows.sort((a,b)=>a.value-b.value);
  }

  function computePoles(){
    const poles = qualifying.filter(q=>q.position==='1' && (!state.circuitId || String(races.find(r=>String(r.raceId)===String(q.raceId)).circuitId) === String(state.circuitId)) && (!state.year || String(races.find(r=>String(r.raceId)===String(q.raceId)).year) === String(state.year)));
    // apply driver/constructor filters
    let filtered = poles;
    if(state.driverId) filtered = filtered.filter(p=>String(p.driverId) === String(state.driverId));
    if(state.constructorId) filtered = filtered.filter(p=>String(p.constructorId) === String(state.constructorId) || (results.find(r=>String(r.raceId)===String(p.raceId) && String(r.driverId)===String(p.driverId))||{}).constructorId === String(state.constructorId));
    if(state.mode === 'driver'){
      const by = d3.rollup(filtered, v=>v.length, d=>d.driverId);
      return Array.from(by, ([id,count])=>({id, name:getName(find(drivers,'driverId',id),'drivers'), value:count})).sort((a,b)=>b.value-a.value);
    }
    // constructor mode
    const by = d3.rollup(filtered, v=>v.length, d=> d.constructorId ? d.constructorId : (results.find(r=>String(r.raceId)===String(d.raceId) && String(r.driverId)===String(d.driverId)) || {}).constructorId );
    return Array.from(by, ([id,count])=>({id, name:getName(find(constructors,'constructorId',id),'constructors'), value:count})).sort((a,b)=>b.value-a.value);
  }

  function computePitStops(){
    const pits = pit_stops.filter(p=>p.milliseconds && (!state.circuitId || String((races.find(r=>String(r.raceId)===String(p.raceId))||{}).circuitId) === String(state.circuitId)) && (!state.year || String((races.find(r=>String(r.raceId)===String(p.raceId))||{}).year) === String(state.year)));
    // apply driver/constructor filters
    let filtered = pits;
    if(state.driverId) filtered = filtered.filter(p=>String(p.driverId) === String(state.driverId));
    if(state.constructorId) filtered = filtered.filter(p=> String(p.constructorId) === String(state.constructorId) || (results.find(r=>String(r.raceId)===String(p.raceId) && String(r.driverId)===String(p.driverId))||{}).constructorId === String(state.constructorId));
    if(state.mode === 'driver'){
      // compute fastest and count per driver
      const grouped = d3.group(filtered, d=>d.driverId);
      const rows = Array.from(grouped, ([id,items])=>({id, name:getName(find(drivers,'driverId',id),'drivers'), value: d3.min(items, d=>+d.milliseconds), count: items.length})).sort((a,b)=>a.value-b.value);
      return rows;
    }
    // constructor mode
    const grouped = d3.group(filtered, d=> d.constructorId ? d.constructorId : (results.find(r=>String(r.raceId)===String(d.raceId) && String(r.driverId)===String(d.driverId))||{}).constructorId);
    const rows = Array.from(grouped, ([id,items])=>({id, name:getName(find(constructors,'constructorId',id),'constructors'), value: d3.min(items, d=>+d.milliseconds), count: items.length})).sort((a,b)=>a.value-b.value);
    return rows;
  }

  // update all charts
  function updateAll(){
    // standings
    const standingsData = computeStandings();
    drawBarChart('#standingsChart svg', standingsData, {labelKey:'name', valueKey:'value', top:10});
    // wins
    const winsData = computeWinsByCircuit();
    drawPieChart('#winsChart svg', winsData, {labelKey:'name', valueKey:'value', top:8});
    // records
    const recs = computeRecords();
    // show fastest laps per circuit as bars
    const recData = recs.map(r=>({name:r.name + ' ('+ (r.sub||'') +')', value:r.value}));
    drawBarChart('#recordsChart svg', recData, {labelKey:'name', valueKey:'value', top:8});
    // poles
    const polesData = computePoles();
    drawBarChart('#poleChart svg', polesData, {labelKey:'name', valueKey:'value', top:8});
    // pits
    const pitD = computePitStops();
    // draw bubble for pitstops
    drawBubbleChart('#pitDriverChart svg', pitD, {xKey:'count', yKey:'value', rKey:'count', labelKey:'name', top:60});
    // constructors chart: show constructor-specific pits
    const pitCons = computePitStops();
    drawBarChart('#pitConstructorChart svg', pitCons, {labelKey:'name', valueKey:'value', top:8});
    adjustGrid();
  }

  // adaptive grid: choose number of columns close to square layout and limited by available width
  function adjustGrid(){
    const container = document.querySelector('.dashboard-grid');
    if(!container) return;
    const cards = Array.from(container.querySelectorAll('.card')).filter(c=> c.offsetParent !== null); // visible cards
    const n = Math.max(1, cards.length);
    const containerWidth = container.clientWidth || container.getBoundingClientRect().width || window.innerWidth;
    const minCardWidth = 300; // minimum comfortable card width in px

    // how many columns can we fit by width
    const maxColsByWidth = Math.max(1, Math.floor(containerWidth / minCardWidth));

    let cols;
    // Prefer a 3-column layout when possible (and avoid cards stretched too wide)
    if(maxColsByWidth >= 3){
      // if we have at least 3 cards, prefer 3 columns so layout tends to 3x2 when ~6 cards
      if(n >= 3) cols = Math.min(3, n);
      else cols = n; // 1 or 2 cards -> use 1 or 2 columns
    } else {
      // narrow screen: use as many columns as can fit but not more than cards
      cols = Math.min(Math.max(1, maxColsByWidth), n);
    }

    // final clamp
    cols = Math.max(1, Math.min(cols, n));

    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  }

  // call adjustGrid after render and on resize
  window.addEventListener('resize', ()=>{ adjustGrid(); setTimeout(adjustGrid, 200); });

  // wire UI -> state
  const btnDrivers = document.getElementById('btnDrivers');
  const btnConstructors = document.getElementById('btnConstructors');
  function setMode(m){ state.mode = m; btnDrivers.classList.toggle('active', m==='driver'); btnConstructors.classList.toggle('active', m==='constructor'); updateAll(); }
  btnDrivers.onclick = ()=> setMode('driver');
  btnConstructors.onclick = ()=> setMode('constructor');

  // circuit selector: add 'All circuits' option
  const circuitSelect = document.getElementById('circuitSelect');
  const allOpt = document.createElement('option'); allOpt.value = ''; allOpt.text = 'Tous les circuits'; circuitSelect.appendChild(allOpt);
  circuits.forEach(c=>{ const opt = document.createElement('option'); opt.value = c.circuitId; opt.text = c.name; circuitSelect.appendChild(opt); });
  circuitSelect.onchange = ()=>{ state.circuitId = circuitSelect.value || null; updateAll(); };

  // driver selector
  const driverSelect = document.getElementById('driverSelect');
  // populate drivers sorted by name
  const sortedDrivers = drivers.slice().map(d=>({id:d.driverId, name: ((d.forename||'') + ' ' + (d.surname||'')).trim()})).sort((a,b)=>a.name.localeCompare(b.name));
  sortedDrivers.forEach(d=>{ const o = document.createElement('option'); o.value = d.id; o.text = d.name; driverSelect.appendChild(o); });
  driverSelect.onchange = ()=>{
    state.driverId = driverSelect.value || null;
    if(state.driverId) { state.constructorId = null; constructorSelect.value = ''; }

    // Update charts immediately so the UI responds even if metadata fetch fails or is slow
    updateAll();

    // Try to fetch driver metadata asynchronously (non-blocking). Guard against undefined helper.
    (async ()=>{
      try{
        const drvRow = state.driverId ? find(drivers, 'driverId', state.driverId) : null;
        if(typeof tryFetchOpenF1Image === 'function'){
          const meta = await tryFetchOpenF1Image(state.driverId, drvRow ? drvRow.driverRef : null, drvRow ? drvRow.number : null, drvRow ? ((drvRow.forename||'') + ' ' + (drvRow.surname||'')).trim() : null);
          if(meta && meta.teamColour){ applyTeamColour(meta.teamColour); }
        }
      } catch(e){ console.warn('driver metadata fetch failed', e); }
    })();
  };

  // constructor selector
  const constructorSelect = document.getElementById('constructorSelect');
  const sortedCons = constructors.slice().map(c=>({id:c.constructorId, name:c.name || ''})).sort((a,b)=>a.name.localeCompare(b.name));
  sortedCons.forEach(c=>{ const o = document.createElement('option'); o.value = c.id; o.text = c.name; constructorSelect.appendChild(o); });
  constructorSelect.onchange = ()=>{ state.constructorId = constructorSelect.value || null; if(state.constructorId){ state.driverId = null; driverSelect.value = ''; } updateAll(); };

  // year selector
  const yearSelect = document.getElementById('yearSelect');
  const years = Array.from(new Set(races.map(r=>r.year))).sort((a,b)=>b-a);
  const allY = document.createElement('option'); allY.value=''; allY.text='Toutes les années'; yearSelect.appendChild(allY);
  years.forEach(y=>{ const o=document.createElement('option'); o.value=y; o.text=y; yearSelect.appendChild(o); });
  yearSelect.onchange = ()=>{ state.year = yearSelect.value || null; updateAll(); };

  // reset filters button: restore UI controls and state to defaults
  function resetFilters(){
    try{
      // reset selects
      if(circuitSelect) circuitSelect.value = '';
      if(yearSelect) yearSelect.value = '';
      if(driverSelect) driverSelect.value = '';
      if(constructorSelect) constructorSelect.value = '';

      // reset state
      state.mode = 'driver';
      state.circuitId = null;
      state.year = null;
      state.driverId = null;
      state.constructorId = null;

      // remove any programmatic accent override so CSS default applies
      try{ document.documentElement.style.removeProperty('--accent'); } catch(e){}

      // update UI and charts
      setMode('driver');
      updateAll();
    } catch(e){ console.error('resetFilters error', e); }
  }

  const btnReset = document.getElementById('btnResetFilters');
  if(btnReset) btnReset.onclick = resetFilters;

  // add tooltip for info icons
  const tooltip = d3.select('body').append('div').attr('class','tooltip');
  d3.selectAll('.info').on('mouseenter', function(event){
    const desc = this.getAttribute('data-desc') || '';
    tooltip.style('display','block').html(desc);
  }).on('mousemove', function(event){
    const x = event.clientX + 12;
    const y = event.clientY + 12;
    tooltip.style('left', x + 'px').style('top', y + 'px');
  }).on('mouseleave', function(){ tooltip.style('display','none'); });

  // initial render
  // set default active button style
  // wait a small tick to allow overlay GO animation to finish if running
  setMode('driver');
  updateAll();
  adjustGrid();
  try{ hideSpinner(); } catch(e){}

  // small helpers to show/hide the F1 tyre spinner added to the header
  function showSpinner(){
    try{
      const wrap = document.getElementById('spinnerWrap');
      const svg = document.getElementById('f1Spinner');
      if(!wrap || !svg) return;
      wrap.classList.remove('spinner-hidden'); wrap.classList.add('spinner-visible');
      svg.classList.add('rotating');
      wrap.setAttribute('aria-hidden','false');
    } catch(e){ }
  }
  function hideSpinner(){
    try{
      const wrap = document.getElementById('spinnerWrap');
      const svg = document.getElementById('f1Spinner');
      if(!wrap || !svg) return;
      svg.classList.remove('rotating');
      wrap.classList.remove('spinner-visible'); wrap.classList.add('spinner-hidden');
      wrap.setAttribute('aria-hidden','true');
    } catch(e){ }
  }

  // position the spinner directly under the header band (top-right)
  function positionSpinner(){
    try{
      const wrap = document.getElementById('spinnerWrap');
      const header = document.querySelector('header');
      if(!wrap || !header) return;
      const rect = header.getBoundingClientRect();
      // place 6px below header bottom, account for scroll
      const top = rect.bottom + 6 + window.scrollY;
      wrap.style.position = 'absolute';
      wrap.style.top = top + 'px';
      wrap.style.right = '18px';
    } catch(e){ }
  }

  // expose to global for simple calls from console or other modules
  window.showSpinner = showSpinner;
  window.hideSpinner = hideSpinner;

  // helper to expand a card
  function makeCardExpandable(){
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
      card.style.cursor = 'zoom-in';
      card.addEventListener('click', function(ev){
        // prevent clicks on controls/info icons from expanding
        if(ev.target.closest('.info') || ev.target.closest('.controls') || ev.target.closest('button') || ev.target.closest('select')) return;
        openExpanded(card);
      });
    });
  }

  function openExpanded(card){
    // overlay
    const overlay = document.createElement('div'); overlay.className='overlay'; document.body.appendChild(overlay);
    // clone card into expanded container or add class
    card.classList.add('expanded');
    // close button
    let close = card.querySelector('.close-btn');
    if(!close){
      close = document.createElement('button'); close.className='close-btn'; close.innerHTML='✕'; card.appendChild(close);
    }
    close.addEventListener('click', ()=> closeExpanded(card, overlay));
    // ESC to close
    function escHandler(e){ if(e.key === 'Escape') closeExpanded(card, overlay); }
    document.addEventListener('keydown', escHandler);
    overlay.addEventListener('click', ()=> closeExpanded(card, overlay));
    // re-render charts to fit new size (use timeout so CSS applied)
    setTimeout(()=>{ updateAll(); }, 120);
    // store handler for removal
    card._escHandler = escHandler;
  }

  function closeExpanded(card, overlay){
    if(overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    card.classList.remove('expanded');
    const close = card.querySelector('.close-btn'); if(close) close.remove();
    if(card._escHandler) document.removeEventListener('keydown', card._escHandler);
    setTimeout(()=>{ updateAll(); }, 120);
  }

  // after initial render wire expand handlers
  makeCardExpandable();

}
// ... (tout votre code existant dans init) ...

  // --- GESTION DE LA SÉCURITÉ ET DU BOUTON ---
  function handleAuthAndSecurity() {
    // 1. Récupérer les infos de l'utilisateur (stockées lors du login)
    // On suppose que vous avez stocké 'role' et 'username' dans le localStorage
    const role = localStorage.getItem('userRole'); 
    const username = localStorage.getItem('userame');
    const authBtn = document.getElementById('authBtn');

    // 2. Gestion du bouton Connexion/Déconnexion
    if (username) {
      // Si connecté
      authBtn.textContent = `Déconnexion (${username})`;
      authBtn.classList.add('logout-mode');
      authBtn.href = "#"; // On désactive le lien par défaut
      
      authBtn.onclick = (e) => {
        e.preventDefault();
        // Déconnexion : on vide le stockage et on redirige
        localStorage.clear();
        window.location.href = "../index.html"; // Retour à l'accueil
      };
    } else {
      // Si pas connecté
      authBtn.textContent = "Connexion Membre";
      authBtn.classList.remove('logout-mode');
      authBtn.href = "../login.html"; // Lien vers la page de login
    }

    // 3. Protection du graphique complexe (Bubble Chart)
    // L'ID de la section du graphique complexe est 'pitStopsDriver'
    const protectedSection = document.getElementById('pitStopsDriver');
    
    // Si l'utilisateur n'est PAS admin (ou n'est pas connecté du tout)
    if (role !== 'admin') {
      if (protectedSection) {
        // Ajouter la classe CSS pour flouter
        protectedSection.classList.add('locked');

        // Créer le message de blocage
        const overlay = document.createElement('div');
        overlay.className = 'lock-overlay';
        overlay.innerHTML = `
          <div class="lock-message">
            <span class="lock-icon">🔒</span>
            <h3>Accès Restreint</h3>
            <p>Vous devez être un <strong>administrateur</strong> pour analyser les données détaillées des pitstops.</p>
            ${!username ? '<a href="../login.html" style="color: var(--accent); font-weight:bold;">Se connecter</a>' : ''}
          </div>
        `;
        
        // Ajouter le message sur le graphique
        protectedSection.appendChild(overlay);
      }
    }
  }

  // Appeler la fonction de sécurité
  handleAuthAndSecurity();

  // ... (fin de la fonction init)
init().catch(err=>{ console.error(err); document.body.insertAdjacentHTML('beforeend', '<p style="color:red">Erreur: '+err.message+'</p>') });
