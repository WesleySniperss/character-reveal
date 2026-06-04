// ═══════════════════════════════════════════════════════════════
// CHARACTER REVEAL — main.js
// Foundry VTT v13 · no import/export (classic script)
// ═══════════════════════════════════════════════════════════════

const CR_ID = 'character-reveal';

// Static background assets per style — preloaded before animation to avoid mid-animation GPU freeze
const CR_BG_ASSETS = {
  'vtm-toreador':  'Toreador1.jpg',
  'vtm-ventrue':   'Ventrue back.png',
  'vtm-nosferatu': null,
  'vtm-gangrel':   null,
  'vtm-brujah':    null,
  'vtm-malkavian': null,
  'vtm-tremere':   null,
};

const CR_STYLES = [
  { id: 'minimal',     label: 'Minimal',     icon: 'fa-circle-half-stroke' },
  { id: 'tarantino',   label: 'Tarantino',   icon: 'fa-film' },
  { id: 'wantedpost',  label: 'One Piece',   icon: 'fa-scroll' },
  { id: 'borderlands', label: 'Borderlands', icon: 'fa-bomb' },
  { id: 'heraldry',    label: 'Heraldry',    icon: 'fa-shield-halved' },
  { id: 'darksouls',   label: 'Dark Souls',  icon: 'fa-skull' },
  { id: 'manuscript',  label: 'Manuscript',  icon: 'fa-book-open' },
  { id: 'spotlight',   label: 'Spotlight',   icon: 'fa-star' },
  { id: 'leone',        label: 'Leone',        icon: 'fa-eye' },
  { id: 'vtm-ventrue',   label: 'VTM Ventrue',   icon: 'fa-crown' },
  { id: 'vtm-malkavian', label: 'VTM Malkavian', icon: 'fa-brain' },
  { id: 'vtm-toreador',  label: 'VTM Toreador',  icon: 'fa-palette' },
  { id: 'vtm-nosferatu', label: 'VTM Nosferatu', icon: 'fa-eye-slash' },
  { id: 'vtm-gangrel',   label: 'VTM Gangrel',   icon: 'fa-paw' },
  { id: 'vtm-brujah',    label: 'VTM Brujah',    icon: 'fa-fist-raised' },
  { id: 'vtm-tremere',    label: 'VTM Tremere',    icon: 'fa-wand-sparkles' },
  { id: 'vtm-lasombra',  label: 'VTM Lasombra',  icon: 'fa-moon' },
  { id: 'vtm-hecata',    label: 'VTM Hecata',    icon: 'fa-skull' },
  { id: 'vtm-tzimisce',  label: 'VTM Tzimisce',  icon: 'fa-dna' },
];

// ─── Settings ─────────────────────────────────────────────────────────────────
Hooks.once('init', () => {
  console.log('Character Reveal | init');

  const reg = (key, def, type = String) => game.settings.register(CR_ID, key, {
    scope: 'world', config: false, type, default: def
  });

  reg('style',      'minimal');
  reg('showName',   true,  Boolean);
  reg('showClass',  true,  Boolean);
  reg('showClan',   true,  Boolean);
  reg('customText', '');
  reg('soundFile',  '');
  reg('playSound',  true, Boolean);
});

// ─── VTools button ─────────────────────────────────────────────────────────────
Hooks.once('vtools.ready', () => {
  VTools.register({
    name:    CR_ID,
    title:   'Character Reveal',
    icon:    'fas fa-masks-theater',
    onClick: crOpenDialog
  });
});

// ─── Socket ────────────────────────────────────────────────────────────────────
Hooks.once('ready', () => {
  game.socket.on(`module.${CR_ID}`, async data => {
    if (data.action === 'reveal') await crShowOverlay(data);
  });
});

// ═══════════════════════════════════════════════════════════════
// DIALOG
// ═══════════════════════════════════════════════════════════════

function crOpenDialog() {
  const token = canvas.tokens?.controlled[0];
  if (!token) {
    ui.notifications.warn('Character Reveal: select a token on the scene first.');
    return;
  }
  new CRDialog(token.actor).render(true);
}

class CRDialog extends Application {
  constructor(actor) {
    super();
    this.actor = actor;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:        'cr-dialog',
      title:     'Character Reveal',
      width:     520,
      height:    'auto',
      classes:   ['cr-dialog-app'],
      resizable: false,
    });
  }

  async _renderInner(_data) {
    const g   = k => game.settings.get(CR_ID, k);
    const cur = g('style');
    const img = this.actor.img || 'icons/svg/mystery-man.svg';

    const pillsHtml = CR_STYLES.map(s => `
      <label class="cr-pill ${s.id === cur ? 'cr-pill--active' : ''}" data-style="${s.id}">
        <input type="radio" name="cr-style" value="${s.id}" ${s.id === cur ? 'checked' : ''} hidden>
        <i class="fas ${s.icon}"></i>
        <span>${s.label}</span>
      </label>
    `).join('');

    const html = `
      <div class="cr-dialog-body">

        <div class="cr-top-row">
          <div class="cr-portrait-thumb">
            <img src="${img}" alt="">
          </div>
          <div class="cr-top-right">
            <div class="cr-actor-name">${this.actor.name}</div>
            <div class="cr-field-label">Style</div>
            <div class="cr-pills">${pillsHtml}</div>
          </div>
        </div>

        <div class="cr-field-label" style="margin-top:12px">Show</div>
        <div class="cr-toggles">
          <label class="cr-toggle">
            <input type="checkbox" name="cr-showName"  ${g('showName')  ? 'checked' : ''}>
            <span>Character name</span>
          </label>
          <label class="cr-toggle cr-toggle--class" ${cur.startsWith('vtm') ? 'style="display:none"' : ''}>
            <input type="checkbox" name="cr-showClass" ${g('showClass') ? 'checked' : ''}>
            <span>Class / Subclass</span>
          </label>
          <label class="cr-toggle cr-toggle--clan" ${cur.startsWith('vtm') ? '' : 'style="display:none"'}>
            <input type="checkbox" name="cr-showClan" ${g('showClan') ? 'checked' : ''}>
            <span>Clan name</span>
          </label>
        </div>

        <div class="cr-field-label">Custom text <em>(optional)</em></div>
        <input type="text" name="cr-customText" class="cr-input"
               value="${g('customText')}"
               placeholder="e.g. «The legend returns»">

        <div class="cr-field-label">Sound</div>
        <div class="cr-toggles">
          <label class="cr-toggle">
            <input type="checkbox" name="cr-playSound" ${g('playSound') ? 'checked' : ''}>
            <span>Play sound</span>
          </label>
        </div>
        <div class="cr-sound-hint">Drop audio files into <code>modules/character-reveal/sounds/</code>.<br>Name them after the style (e.g. <code>minimal.mp3</code>, <code>darksouls.ogg</code>) for per-style sounds, or use any name as a fallback for all styles.</div>

        <div class="cr-footer">
          <button type="button" class="cr-btn cr-btn--cancel">
            <i class="fas fa-times"></i> Cancel
          </button>
          <button type="button" class="cr-btn cr-btn--reveal">
            <i class="fas fa-eye"></i> Reveal!
          </button>
        </div>

      </div>
    `;

    return $(html);
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Style pills
    html.find('.cr-pill').on('click', function () {
      html.find('.cr-pill').removeClass('cr-pill--active');
      $(this).addClass('cr-pill--active');
      $(this).find('input').prop('checked', true);
      const sv = $(this).find('input').val();
      html.find('.cr-toggle--class').toggle(!sv.startsWith('vtm'));
      html.find('.cr-toggle--clan').toggle(sv.startsWith('vtm'));
    });

    html.find('.cr-btn--cancel').on('click', () => this.close());
    html.find('.cr-btn--reveal').on('click', () => this._doReveal(html));
  }

  async _doReveal(html) {
    const root       = this.element;
    const style      = root.find('[name="cr-style"]:checked').val() || 'minimal';
    const showName   = root.find('[name="cr-showName"]').is(':checked');
    const showClass  = root.find('[name="cr-showClass"]').is(':checked');
    const showClan   = root.find('[name="cr-showClan"]').is(':checked');
    const customText = root.find('[name="cr-customText"]').val().trim();
    const playSound  = root.find('[name="cr-playSound"]').is(':checked');

    await Promise.all([
      game.settings.set(CR_ID, 'style',      style),
      game.settings.set(CR_ID, 'showName',   showName),
      game.settings.set(CR_ID, 'showClass',  showClass),
      game.settings.set(CR_ID, 'showClan',   showClan),
      game.settings.set(CR_ID, 'customText', customText),
      game.settings.set(CR_ID, 'playSound',  playSound),
    ]);

    const actor = this.actor;
    const payload = {
      action:       'reveal',
      style,
      showName,
      showClass,
      showClan,
      customText,
      actorImg:       actor.img  || 'icons/svg/mystery-man.svg',
      actorName:      actor.name || '',
      actorIsNPC:     actor.type === 'npc' || actor.type === 'monster',
      actorClass:     crGetClass(actor),
      actorSubclass:  crGetSubclass(actor),
      actorRace:      crGetRace(actor),
      actorCR:        actor.system?.details?.cr ?? '',
      actorAlignment: actor.system?.details?.alignment || '',
      actorLevel:     actor.system?.details?.level || null,
      actorHpMax:     actor.system?.attributes?.hp?.max || null,
      actorClan:      crGetClan(actor),
    };

    payload.soundSrc = playSound ? await crResolveSoundSrc(style) : null;
    game.socket.emit(`module.${CR_ID}`, payload);
    crShowOverlay(payload);
    this.close();
  }
}

// ─── Helpers to get class info across systems ──────────────────────────────────
function crGetClass(actor) {
  if (actor.type === 'npc' || actor.type === 'monster') {
    // a5e: creatureTypes is an array
    const a5eTypes = actor.system?.details?.creatureTypes;
    if (Array.isArray(a5eTypes) && a5eTypes.length) return a5eTypes.join(', ');
    // dnd5e: type is an object { value, subtype, custom }
    const t = actor.system?.details?.type;
    if (!t) return actor.system?.details?.creatureType || '';
    if (typeof t === 'string') return t;
    const mainType = t.value === 'custom' ? (t.custom || '') : (t.value || '');
    return [mainType, t.subtype].filter(Boolean).join(' · ');
  }
  // PC — works for both systems
  return actor.system?.details?.class
    || actor.items?.find(i => i.type === 'class')?.name
    || '';
}

function crGetSubclass(actor) {
  if (actor.type === 'npc' || actor.type === 'monster') return '';
  return actor.system?.details?.subclass
    || actor.items?.find(i => i.type === 'subclass')?.name
    || '';
}

function crGetRace(actor) {
  if (actor.type === 'npc' || actor.type === 'monster') return '';
  // a5e: heritage item
  const heritage = actor.items?.find(i => i.type === 'heritage')?.name;
  if (heritage) return heritage;
  // dnd5e: race field (string or object) or race item
  const r = actor.system?.details?.race;
  if (typeof r === 'string' && r) return r;
  if (r && typeof r === 'object' && r.name) return r.name;
  return actor.items?.find(i => i.type === 'race')?.name || '';
}

function crGetClan(actor) {
  return actor.system?.details?.clan?.value
    || actor.system?.clan?.value
    || actor.system?.clan
    || '';
}

// ═══════════════════════════════════════════════════════════════
// OVERLAY
// ═══════════════════════════════════════════════════════════════

function crIsMuted() { return localStorage.getItem('cr-muted') === '1'; }
function crSetMuted(v) { localStorage.setItem('cr-muted', v ? '1' : '0'); }

async function crResolveSoundSrc(style) {
  const folder   = `modules/${CR_ID}/sounds/`;
  const audioExt = new Set(['mp3', 'ogg', 'wav', 'flac', 'webm', 'm4a', 'aac']);
  try {
    const result = await FilePicker.browse('data', folder);
    const files  = result.files.filter(f => audioExt.has(f.split('.').pop().toLowerCase()));
    const match  = files.find(f => f.split('/').pop().replace(/\.[^.]+$/, '').toLowerCase() === style);
    return match || files[0] || null;
  } catch (e) {
    console.warn(`${CR_ID} | Cannot browse sounds folder:`, e);
    return null;
  }
}

function crPlaySound(src) {
  if (!src || crIsMuted()) return;
  console.log(`${CR_ID} | Playing: ${src}`);
  try {
    AudioHelper.play({ src, volume: 0.8, autoplay: true, loop: false }, false);
  } catch (e) {
    const a = new Audio(src);
    a.volume = 0.8;
    a.play().catch(err => console.warn(`${CR_ID} | Audio error:`, err));
  }
}

async function crShowOverlay(data) {
  crPlaySound(data.soundSrc || null);

  document.getElementById('cr-overlay')?.remove();

  // Decode ALL images before overlay appears — prevents mid-animation GPU upload freeze.
  // CSS url() backgrounds load separately from <img> tags; both must be pre-decoded.
  const bgFile = CR_BG_ASSETS[data.style];
  const srcs = [
    data.actorImg,
    bgFile ? `modules/${CR_ID}/assets/${bgFile}` : null,
  ].filter(Boolean);
  await Promise.all(srcs.map(src => {
    const img = new Image();
    img.src = src;
    return img.decode().catch(() => {});
  }));

  const el = document.createElement('div');
  el.id = 'cr-overlay';
  el.dataset.style = data.style;
  el.innerHTML = crBuildHTML(data) +
    '<div class="cr-dismiss-hint">click anywhere to close</div>' +
    `<button class="cr-mute-btn ${crIsMuted() ? 'cr-mute-btn--off' : ''}" title="Toggle sound">
       <i class="fas ${crIsMuted() ? 'fa-volume-xmark' : 'fa-volume-high'}"></i>
     </button>`;

  document.body.appendChild(el);
  // Double rAF: frame 1 = layout+composite (GPU uploads via will-change on #cr-overlay),
  // frame 2 = add cr-visible so animations start on clean slate with textures already in VRAM.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.classList.add('cr-visible');
    if (el.dataset.style === 'vtm-tzimisce') {
      _crTzeLive.clear();
      el.querySelectorAll('.cr-tre-eye-wrap').forEach(crTreBlink);
    }
    if (el.dataset.style === 'tarantino') crTaRun(el);
  }));

  // Mute button — stops propagation so it doesn't close the overlay
  el.querySelector('.cr-mute-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    const muted = !crIsMuted();
    crSetMuted(muted);
    this.classList.toggle('cr-mute-btn--off', muted);
    this.querySelector('i').className = `fas ${muted ? 'fa-volume-xmark' : 'fa-volume-high'}`;
  });

  const dismiss = () => {
    el.classList.remove('cr-visible');
    setTimeout(() => el.remove(), 500);
  };

  // Only the GM can close the overlay
  el.addEventListener('click', () => {
    if (typeof game !== 'undefined' && game.user && !game.user.isGM) return;

    if (el.dataset.style === 'vtm-malkavian') {
      // Malkavian: click 1 = crack, click 2 = close
      if (!el.classList.contains('cr-mal-cracked')) {
        el.querySelector('.cr-vtm-preimage')
          ?.insertAdjacentHTML('beforeend', CR_MAL_PRECRACK_SVG);
        el.classList.add('cr-mal-cracked');
      } else {
        dismiss();
      }
    } else {
      dismiss();
    }
  });

  const onKey = e => {
    if (e.key === 'Escape') { dismiss(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);
}

// ─── Master HTML builder ────────────────────────────────────────────────────────
function crBuildHTML(data) {
  const { style, showName, showClass, showClan, customText, actorImg, actorName,
          actorClass, actorSubclass, actorRace, actorIsNPC, actorCR, actorAlignment,
          actorClan } = data;

  const name   = showName  ? (actorName  || '') : '';
  const custom = customText || '';
  const img    = `<img class="cr-portrait-img" src="${actorImg}" alt="${actorName}" decoding="async">`;

  // Build secondary info line
  let cls = '';
  if (showClass) {
    if (actorIsNPC) {
      // NPC: creature type + CR
      const crLabel = (actorCR !== null && actorCR !== undefined && actorCR !== '') ? `CR ${actorCR}` : '';
      cls = [actorClass, crLabel].filter(Boolean).join(' · ');
    } else {
      // PC: race · class · subclass
      cls = [actorRace, actorClass, actorSubclass].filter(Boolean).join(' · ');
      // fallback to alignment if nothing found
      if (!cls) cls = actorAlignment || '';
    }
  }

  switch (style) {
    case 'tarantino':   return crHtmlTarantino(img, name, cls, custom);
    case 'wantedpost':  return crHtmlWanted(img, name, cls, custom);
    case 'borderlands': return crHtmlBorderlands(img, name, cls, custom);
    case 'heraldry':    return crHtmlHeraldry(img, name, cls, custom);
    case 'darksouls':   return crHtmlDarkSouls(img, name, cls, custom);
    case 'manuscript':  return crHtmlManuscript(img, name, cls, custom);
    case 'spotlight':   return crHtmlSpotlight(img, name, cls, custom);
    case 'leone':         return crHtmlLeone(img, name, cls, custom);
    case 'vtm-ventrue':   return crHtmlVtmVentrue(img, name, cls, custom, showClan, actorClan);
    case 'vtm-malkavian': return crHtmlVtmMalkavian(img, name, cls, custom, actorImg, showClan, actorClan);
    case 'vtm-toreador':  return crHtmlVtmToreador(img, name, cls, custom, showClan, actorClan);
    case 'vtm-nosferatu': return crHtmlVtmNosferatu(img, name, cls, custom, showClan, actorClan);
    case 'vtm-gangrel':   return crHtmlVtmGangrel(img, name, cls, custom, showClan, actorClan);
    case 'vtm-brujah':    return crHtmlVtmBrujah(img, name, cls, custom, showClan, actorClan);
    case 'vtm-tremere':    return crHtmlVtmTremere(img, name, cls, custom, showClan, actorClan);
    case 'vtm-lasombra':   return crHtmlVtmLasombra(img, name, cls, custom, showClan, actorClan);
    case 'vtm-hecata':     return crHtmlVtmHecata(img, name, cls, custom, showClan, actorClan);
    case 'vtm-tzimisce':   return crHtmlVtmTzimisce(img, name, cls, custom, showClan, actorClan);
    default:               return crHtmlMinimal(img, name, cls, custom, actorImg);
  }
}

// ─── Style: Minimal ────────────────────────────────────────────────────────────
function crHtmlMinimal(img, name, cls, custom, imgSrc) {
  return `
    <div class="cr-mn-bg" style="background-image:url('${imgSrc}')"></div>
    <div class="cr-mn-portrait">${img}</div>
    <div class="cr-mn-vignette"></div>
    <div class="cr-mn-gradient"></div>
    <div class="cr-mn-bar cr-mn-bar--top"></div>
    <div class="cr-mn-bar cr-mn-bar--bottom"></div>
    <div class="cr-mn-text">
      <div class="cr-mn-line"></div>
      ${name   ? `<div class="cr-mn-name">${name}</div>`   : ''}
      ${cls    ? `<div class="cr-mn-class">${cls}</div>`   : ''}
      ${custom ? `<div class="cr-mn-custom">${custom}</div>` : ''}
    </div>
  `;
}

// ─── Style: Tarantino ──────────────────────────────────────────────────────────
function crHtmlTarantino(img, name, cls, custom) {
  const fields = [
    custom && { text: custom, mod: 'custom' },
    name   && { text: name,   mod: 'name'   },
    cls    && { text: cls,    mod: 'cls'     },
  ].filter(Boolean);

  const cardsHtml = fields.map(f => `
    <div class="cr-ta-card cr-ta-card--${f.mod}">
      <span class="cr-ta-card-val">${f.text}</span>
    </div>`).join('');

  return `
    <div class="cr-ta-grain"></div>
    <div class="cr-ta-grain2"></div>
    <div class="cr-ta-vignette"></div>
    <div class="cr-ta-portrait">${img}</div>
    <div class="cr-ta-cards">${cardsHtml}</div>
  `;
}

function crTaRun(el) {
  const cards = [...el.querySelectorAll('.cr-ta-card')];
  if (!cards.length) return;

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function show(card) {
    card.style.transition = 'none';
    card.style.opacity = '0';
    card.style.transform = 'translateY(12px)';
    await sleep(16);
    card.style.transition = 'opacity 0.08s linear, transform 0.12s cubic-bezier(0.2,0,0.4,1)';
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
  }

  async function hide(card) {
    card.style.transition = 'opacity 0.06s linear';
    card.style.opacity = '0';
    await sleep(80);
    card.style.transition = 'none';
    card.style.transform = 'translateY(12px)';
  }

  async function loop() {
    await sleep(700);
    while (el.isConnected) {
      for (const card of cards) {
        if (!el.isConnected) return;
        await show(card);
        await sleep(1900 + Math.random() * 700);
        if (!el.isConnected) return;
        await hide(card);
        await sleep(480);
      }
    }
  }
  loop();
}

// ─── Style: Wanted Poster ──────────────────────────────────────────────────────
function crHtmlWanted(img, name, cls, custom) {
  return `
    <div class="cr-op-rays"></div>
    <div class="cr-op-poster">
      <span class="cr-op-nail"></span>
      <div class="cr-op-header"><span>WANTED</span></div>
      <div class="cr-op-frame">${img}</div>
      <div class="cr-op-doa">
        <span class="cr-op-doa--sel">DEAD</span>
        <span>OR</span>
        <span>ALIVE</span>
      </div>
      ${name        ? `<div class="cr-op-name">${name}</div>` : ''}
      ${cls||custom ? `<div class="cr-op-desc">${[cls, custom].filter(Boolean).join('<br>')}</div>` : ''}
    </div>
  `;
}

// ─── Style: Borderlands ────────────────────────────────────────────────────────
function crHtmlBorderlands(img, name, cls, custom) {
  return `
    <div class="cr-bl-dots"></div>
    <div class="cr-bl-inner">
      <div class="cr-bl-img">${img}</div>
      <div class="cr-bl-text">
        ${cls    ? `<div class="cr-bl-role">${cls}</div>`   : ''}
        ${name   ? `<div class="cr-bl-name">${name}</div>`  : ''}
        ${custom ? `<div class="cr-bl-bubble"><p>${custom}</p></div>` : ''}
      </div>
    </div>
    <div class="cr-bl-scanlines"></div>
  `;
}

// ─── Style: Heraldry ───────────────────────────────────────────────────────────
function crHtmlHeraldry(img, name, cls, custom) {
  const embers = Array.from({ length: 14 }, () => {
    const x   = (3 + Math.random() * 94).toFixed(1);
    const dur  = (5 + Math.random() * 8).toFixed(1);
    const del  = (Math.random() * 12).toFixed(1);
    const sz   = (1.5 + Math.random() * 2.5).toFixed(1);
    const dx   = ((Math.random() - 0.5) * 50).toFixed(0);
    return `<div class="cr-her-ember" style="--x:${x}%;--dur:${dur}s;--del:${del}s;--sz:${sz}px;--dx:${dx}px"></div>`;
  }).join('');
  return `
    <div class="cr-her-rays"></div>
    <div class="cr-her-embers">${embers}</div>
    <div class="cr-her-torches">
      <div class="cr-her-torch cr-her-torch--left">
        <div class="cr-her-torch-glow"></div>
        <div class="cr-her-torch-fire"></div>
        <div class="cr-her-torch-cup"></div>
        <div class="cr-her-torch-wrap"></div>
        <div class="cr-her-torch-band"></div>
        <div class="cr-her-torch-body"></div>
        <div class="cr-her-torch-ring"></div>
        <div class="cr-her-torch-foot"></div>
      </div>
      <div class="cr-her-torch cr-her-torch--right">
        <div class="cr-her-torch-glow"></div>
        <div class="cr-her-torch-fire"></div>
        <div class="cr-her-torch-cup"></div>
        <div class="cr-her-torch-wrap"></div>
        <div class="cr-her-torch-band"></div>
        <div class="cr-her-torch-body"></div>
        <div class="cr-her-torch-ring"></div>
        <div class="cr-her-torch-foot"></div>
      </div>
    </div>
    <div class="cr-her-banner-wrap">
      <div class="cr-her-banner-top"></div>
      <div class="cr-her-banner-inner">
        <div class="cr-her-banner-body">
          <div class="cr-her-inner-rule"></div>
          <div class="cr-her-ring-wrap"><div class="cr-her-ring">${img}</div></div>
          <div class="cr-her-ornament">✦ ─── ⚜ ─── ✦</div>
          ${name   ? `<div class="cr-her-name">${name}</div>`   : ''}
          ${cls    ? `<div class="cr-her-title">${cls}</div>`   : ''}
          ${custom ? `<div class="cr-her-divider"></div><div class="cr-her-desc">${custom}</div>` : ''}
          <div class="cr-her-inner-rule"></div>
          <div class="cr-her-sigil">✠ ⚜ ✠</div>
        </div>
        <div class="cr-her-banner-tip"></div>
      </div>
    </div>
  `;
}

// ─── Style: Dark Souls ─────────────────────────────────────────────────────────
function crHtmlDarkSouls(img, name, cls, custom) {
  const embers = Array.from({ length: 8 }, (_, i) => `<span class="cr-ds-ember cr-ds-ember--${i+1}"></span>`).join('');
  return `
    <div class="cr-ds-embers">${embers}</div>
    <div class="cr-ds-fog"></div>
    <div class="cr-ds-portrait">${img}</div>
    <div class="cr-ds-text">
      <span class="cr-ds-encounter">${custom || '— encountered —'}</span>
      ${name ? `<span class="cr-ds-name">${name}</span>` : ''}
      ${cls  ? `<span class="cr-ds-class">${cls}</span>` : ''}
    </div>
  `;
}

// ─── Style: Manuscript ─────────────────────────────────────────────────────────
function crHtmlManuscript(img, name, cls, custom) {
  const caseNum = String(Math.floor(Math.random() * 9000) + 1000);
  return `
    <div class="cr-dos-wrap">
      <div class="cr-dos-bg-paper cr-dos-bg-paper--1"></div>
      <div class="cr-dos-bg-paper cr-dos-bg-paper--2"></div>
      <div class="cr-dos-bg-paper cr-dos-bg-paper--3"></div>
    <div class="cr-dos-folder">
      <div class="cr-dos-tab">CLASSIFIED</div>
      <div class="cr-dos-stripe"></div>
      <div class="cr-dos-header">
        <span class="cr-dos-agency">INTELLIGENCE FILE</span>
        <span class="cr-dos-case">CASE #${caseNum}-&#x2588;&#x2588;</span>
      </div>
      <div class="cr-dos-body">
        <div class="cr-dos-photo-col">
          <div class="cr-dos-photo">${img}</div>
          <div class="cr-dos-photo-label">PORTRAIT</div>
        </div>
        <div class="cr-dos-info-col">
          <div class="cr-dos-field-row"><span class="cr-dos-field-lbl">SUBJECT:</span></div>
          <div class="cr-dos-name">${name || '&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;'}</div>
          <div class="cr-dos-field-row"><span class="cr-dos-field-lbl">CLASSIFICATION:</span> <span class="cr-dos-inline-redact">${cls || '&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;'}</span></div>
          <div class="cr-dos-redact-bar"></div>
          ${custom
            ? `<div class="cr-dos-field-row"><span class="cr-dos-field-lbl">NOTES:</span></div><div class="cr-dos-notes">${custom}</div>`
            : '<div class="cr-dos-redact-bar cr-dos-redact-bar--wide"></div>'}
          <div class="cr-dos-redact-bar cr-dos-redact-bar--sm"></div>
        </div>
      </div>
      <div class="cr-dos-footer">
        <span>&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588; INTELLIGENCE AGENCY</span>
        <span>DATE: [REDACTED]</span>
      </div>
      <div class="cr-dos-stamp">TOP SECRET</div>
      <div class="cr-dos-watermark">CONFIDENTIAL</div>
    </div>
    </div>
  `;
}

// ─── Style: Spotlight ──────────────────────────────────────────────────────────
function crHtmlSpotlight(img, name, cls, custom) {
  return `
    <div class="cr-th-curtain cr-th-curtain--left"><div class="cr-th-cloth"></div></div>
    <div class="cr-th-curtain cr-th-curtain--right"><div class="cr-th-cloth"></div></div>
    <div class="cr-th-spotlight"></div>
    <div class="cr-th-floor"></div>
    <div class="cr-th-portrait">${img}</div>
    <div class="cr-th-placard-wrap">
      <div class="cr-th-placard">
        ${name   ? `<span class="cr-th-name">${name}</span>`       : ''}
        ${cls    ? `<span class="cr-th-subtitle">${cls}</span>`    : ''}
        ${custom ? `<span class="cr-th-desc">${custom}</span>`     : ''}
      </div>
    </div>
  `;
}


// ─── Style: Leone ──────────────────────────────────────────────────────────────
function crHtmlLeone(img, name, cls, custom) {
  const sub = [cls, custom].filter(Boolean).join(' · ');
  return `
    <div class="cr-lo-portrait">${img}</div>
    <div class="cr-lo-grain"></div>
    <div class="cr-lo-vignette"></div>
    <div class="cr-lo-fog"></div>
    <div class="cr-lo-bar-top"></div>
    <div class="cr-lo-bar-bot"></div>
    <div class="cr-lo-dustline"></div>
    <div class="cr-lo-text">
      <div class="cr-lo-rule"></div>
      ${name ? `<div class="cr-lo-name">${name}</div>` : ''}
      ${sub  ? `<div class="cr-lo-sub">— ${sub} —</div>` : ''}
    </div>
  `;
}

function rnd(n) { return Math.floor(Math.random() * n); }

// ─── Style: VTM Ventrue ────────────────────────────────────────────────────────
function crHtmlVtmVentrue(img, name, cls, custom, showClan, clan) {
  const sub = [cls, custom].filter(Boolean).join(' · ');
  const clanLabel = showClan ? (clan || 'VENTRUE') : null;
  return `
    <div class="cr-vtv-bg"></div>
    <div class="cr-vtv-pattern"></div>
    <div class="cr-vtv-portrait">${img}</div>
    <div class="cr-vtv-vignette"></div>
    <div class="cr-vtv-text">
      <img class="cr-crest cr-crest--gold" src="modules/character-reveal/assets/Ventrue_symbol.png" alt="">
      ${clanLabel ? `<div class="cr-vtv-clan">✦ &nbsp; ${clanLabel.toUpperCase().split('').join(' ')} &nbsp; ✦</div>` : ''}
      ${name ? `<div class="cr-vtv-name">${name}</div>` : ''}
      ${sub  ? `<div class="cr-vtv-sub">${sub}</div>`   : ''}
    </div>
  `;
}

// ─── Style: VTM Malkavian ──────────────────────────────────────────────────────
const CR_MAL_CRACK_PATHS = `<g fill="none" stroke-linecap="butt"><path d="M 42,48 L 25,8 L 0,0" stroke="rgba(220,235,255,.82)" stroke-width="0.40"/><path d="M 25,8 L 14,0" stroke="rgba(220,235,255,.38)" stroke-width="0.18"/><path d="M 42,48 L 0,35" stroke="rgba(220,235,255,.75)" stroke-width="0.37"/><path d="M 42,48 L 8,88 L 0,88" stroke="rgba(220,235,255,.72)" stroke-width="0.34"/><path d="M 42,48 L 38,100" stroke="rgba(220,235,255,.68)" stroke-width="0.32"/><path d="M 42,48 L 72,95 L 68,100" stroke="rgba(220,235,255,.72)" stroke-width="0.34"/><path d="M 42,48 L 88,62 L 100,62" stroke="rgba(220,235,255,.68)" stroke-width="0.32"/><path d="M 42,48 L 60,5 L 72,28 L 100,18" stroke="rgba(220,235,255,.75)" stroke-width="0.37"/><path d="M 60,0 L 72,28" stroke="rgba(220,235,255,.44)" stroke-width="0.20"/><path d="M 42,48 L 42,0" stroke="rgba(220,235,255,.70)" stroke-width="0.34"/><path d="M 42,48 L 50,42 L 58,35" stroke="rgba(220,235,255,.42)" stroke-width="0.19"/><path d="M 42,48 L 36,42 L 28,36" stroke="rgba(220,235,255,.38)" stroke-width="0.17"/><path d="M 42,48 L 46,56 L 52,66" stroke="rgba(220,235,255,.38)" stroke-width="0.17"/><path d="M 42,48 L 35,54 L 28,62" stroke="rgba(220,235,255,.36)" stroke-width="0.16"/><path d="M 42,48 L 46,46" stroke="rgba(220,235,255,.58)" stroke-width="0.25"/><path d="M 42,48 L 38,46" stroke="rgba(220,235,255,.55)" stroke-width="0.24"/><path d="M 42,48 L 44,51" stroke="rgba(220,235,255,.53)" stroke-width="0.23"/><path d="M 42,48 L 40,51" stroke="rgba(220,235,255,.50)" stroke-width="0.22"/><path d="M 44,47 L 48,45" stroke="rgba(220,235,255,.46)" stroke-width="0.20"/><path d="M 40,49 L 36,51" stroke="rgba(220,235,255,.44)" stroke-width="0.19"/></g>`;
const CR_MAL_PRECRACK_SVG = `<svg class="cr-vtm-precrack" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${CR_MAL_CRACK_PATHS}</svg>`;

const CR_VTM_WHISPERS = [
  'you see it too', '...mirrors', 'we are many', 'broken glass',
  '...listen', 'all of us', 'the truth hurts', '...shattered',
  'they know', '...run', 'not alone', 'inside your head',
  'wake up', '...forgetting', 'beautiful madness', 'cracks in everything',
  'we watch', '...silence', 'no escape', 'it always was'
];

const CR_VTM_SHARDS = [
  { clip:'polygon(0% 0%, 42% 0%, 42% 48%, 25% 8%)',                            drift:'a', jolt:1, dur:18, jd:0.5, pos:'35% 25%', rot:'c' },
  { clip:'polygon(0% 0%, 25% 8%, 42% 48%, 0% 35%)',                            drift:'b', jolt:2, dur:22, jd:0.7, pos:'20% 35%', rot:'a' },
  { clip:'polygon(0% 35%, 42% 48%, 8% 88%, 0% 88%)',                           drift:'c', jolt:3, dur:19, jd:0.9, pos:'15% 60%', rot:'d' },
  { clip:'polygon(0% 88%, 8% 88%, 42% 48%, 38% 100%, 0% 100%)',                drift:'d', jolt:4, dur:24, jd:0.6, pos:'25% 82%', rot:'b' },
  { clip:'polygon(38% 100%, 42% 48%, 72% 95%, 68% 100%)',                      drift:'a', jolt:5, dur:20, jd:0.4, pos:'50% 86%', rot:'d' },
  { clip:'polygon(42% 48%, 88% 62%, 100% 62%, 100% 100%, 68% 100%, 72% 95%)',  drift:'b', jolt:6, dur:16, jd:0.8, pos:'72% 80%', rot:'a' },
  { clip:'polygon(42% 48%, 60% 5%, 72% 28%, 100% 18%, 100% 62%, 88% 62%)',     drift:'c', jolt:7, dur:21, jd:0.3, pos:'80% 45%', rot:'b' },
  { clip:'polygon(42% 0%, 60% 0%, 72% 28%, 60% 5%, 42% 48%)',                  drift:'d', jolt:8, dur:17, jd:1.0, pos:'55% 20%', rot:'c' },
  { clip:'polygon(60% 0%, 100% 0%, 100% 18%, 72% 28%)',                        drift:'a', jolt:9, dur:23, jd:0.2, pos:'82% 12%', rot:'d' },
];

function crHtmlVtmMalkavian(img, name, cls, custom, actorImg, showClan, clan) {
  const sub = [cls, custom].filter(Boolean).join(' · ');
  const clanLabel = showClan ? (clan || 'MALKAVIAN') : null;
  const whispers = CR_VTM_WHISPERS
    .sort(() => Math.random() - .5).slice(0, 20)
    .map((w, i) => `<span class="cr-vtm-whisper cr-vtm-whisper--${i + 1}">${w}</span>`)
    .join('');

  const CRACK_SVG_SHARD = `<svg class="cr-vtm-shard-crack-static" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${CR_MAL_CRACK_PATHS}</svg>`;

  const shards = CR_VTM_SHARDS.map(s => `
    <div class="cr-vtm-shard" style="clip-path:${s.clip};animation-name:cr-vtm-rot3d-${s.rot},cr-vtm-spread-${s.jolt};animation-duration:${(s.dur * 0.9).toFixed(1)}s,${(s.dur * 1.4).toFixed(1)}s;animation-delay:1.8s,1.8s;animation-timing-function:ease-in-out,ease-in-out;animation-iteration-count:infinite,infinite;animation-direction:alternate,alternate;animation-fill-mode:both,both">
      <div class="cr-vtm-sd" style="animation-name:cr-vtm-drift-${s.drift};animation-duration:${(s.dur * 1.6).toFixed(1)}s;animation-delay:1.8s">
        <img src="${actorImg}" alt="" class="cr-vtm-shard-img">
      </div>
      ${CRACK_SVG_SHARD}
    </div>
  `).join('');

  return `
    <div class="cr-vtm-bg"></div>
    <div class="cr-vtm-preimage">
      <img src="${actorImg}" alt="" class="cr-vtm-preimage-img">
      <div class="cr-vtm-preimage-vignette"></div>
    </div>
    ${shards}
    <div class="cr-vtm-noise"></div>
    <div class="cr-vtm-vignette"></div>
    <div class="cr-vtm-whispers">${whispers}</div>
    <div class="cr-vtm-text">
      <img class="cr-crest cr-crest--purple" src="modules/character-reveal/assets/Malkavian_symbol.png" alt="">
      <div class="cr-vtm-name-wrap">
        <span class="cr-vtm-name-r" aria-hidden="true">${name}</span>
        <span class="cr-vtm-name">${name}</span>
        <span class="cr-vtm-name-b" aria-hidden="true">${name}</span>
      </div>
      ${sub ? `<div class="cr-vtm-sub">${sub}</div>` : ''}
      ${clanLabel ? `<div class="cr-vtm-clan">✦ &nbsp; ${clanLabel.toUpperCase().split('').join(' ')} &nbsp; ✦</div>` : ''}
    </div>
  `;
}

// ─── Style: VTM Toreador ───────────────────────────────────────────────────────
function crHtmlVtmToreador(img, name, cls, custom, showClan, clan) {
  const sub = [cls, custom].filter(Boolean).join(' · ');
  const clanLabel = showClan ? (clan || 'TOREADOR') : null;
  const petals = Array.from({length: 12}, () => `<div class="cr-tor-petal"></div>`).join('');
  const quotePool = [
    '«La beauté est la promesse du bonheur.»',
    '«Seul l\'amour donne au sang sa véritable couleur.»',
    '«Le sang est la rose de la nuit.»',
    '«Aimer, c\'est brûler sans se consumer.»',
    '«Le désir est la prison des immortels.»',
    '«Toute beauté cache une blessure secrète.»',
    '«Je suis l\'art et l\'artiste, la proie et le prédateur.»',
    '«Le rouge est la couleur de l\'âme.»',
    '«Dans chaque regard, une éternité de soif.»',
    '«La rose ne demande pas pourquoi elle saigne.»',
    '«Mourir pour un seul regard en vaut l\'éternité.»',
    '«La beauté est le seul péché que les anges reconnaissent.»',
    '«Chaque nuit est une œuvre d\'art que je dévore.»',
    '«L\'éternité est trop courte pour tant de beauté.»',
    '«Je bois ton regard comme un vin interdit.»',
    '«La mort est la plus belle des muses.»',
    '«Le velours de la nuit me drape comme une amante.»',
    '«Toute flamme qui me touche me révèle.»',
    '«Le sang est ma peinture, le monde ma toile.»',
    '«La passion est la seule immortalité qui vaille.»',
    '«La beauté blesse plus sûrement que les crocs.»',
    '«Je ne chasse pas — je crée.»',
    '«Mon âme est une galerie aux miroirs sans fond.»',
    '«L\'art ne meurt pas — il se nourrit.»',
    '«Souffrir est la condition de toute grande œuvre.»',
    '«Le désir est plus doux quand il est défendu.»',
    '«Chaque victime est un chef-d\'œuvre inachevé.»',
    '«Je suis éternelle — et je brûle.»',
  ];
  const r = (a, b) => a + Math.random() * (b - a);
  const zones = [
    { top: r(3,10),  left:  r(2,18),  mw: r(18,25), fs: r(1.5,2.25), align:'left'   },
    { top: r(5,15),  right: r(1,8),   mw: r(10,16), fs: r(1.3,1.8),  align:'right'  },
    { top: r(25,42), left:  r(1,6),   mw: r(10,14), fs: r(1.2,1.65), align:'left'   },
    { top: r(45,62), right: r(1,6),   mw: r(10,14), fs: r(1.26,1.68),align:'right'  },
    { top: r(62,78), left:  r(3,22),  mw: r(14,20), fs: r(1.23,1.62),align:'left'   },
    { top: r(2,8),   left:  r(30,52), mw: r(18,28), fs: r(1.4,2.1),  align:'center' },
    { top: r(74,86), right: r(2,14),  mw: r(12,17), fs: r(1.23,1.65),align:'right'  },
  ];
  // Spread phase offsets evenly across the full 14s cycle using negative delays.
  // Negative delay = animation started N seconds ago → each quote is at a unique phase
  // so they never appear/disappear at the same time.
  const QUOTE_CYCLE = 14;
  const step = QUOTE_CYCLE / zones.length;
  const phaseOffsets = zones.map((_, i) => -(i * step + r(0, step * 0.55)));
  // Shuffle offsets so screen position doesn't correlate with cycle phase
  phaseOffsets.sort(() => Math.random() - 0.5);

  const shuffledQ = quotePool.slice().sort(() => Math.random() - 0.5);
  const quoteHtml = zones.map((z, i) => {
    const q = shuffledQ[i % shuffledQ.length];
    const pos = [];
    if ('top'   in z) pos.push(`top:${z.top.toFixed(1)}%`);
    if ('right' in z) pos.push(`right:${z.right.toFixed(1)}%`);
    if ('left'  in z) pos.push(`left:${z.left.toFixed(1)}%`);
    const st = [
      ...pos,
      `max-width:${z.mw.toFixed(1)}%`,
      `font-size:clamp(1.17rem,${z.fs.toFixed(2)}vw,2.25rem)`,
      `text-align:${z.align}`,
      `--qdel:${phaseOffsets[i].toFixed(2)}s`,
    ].join(';');
    return `<div class="cr-tor-bg-quote" style="${st}">${q}</div>`;
  }).join('\n        ');
  return `
    <img class="cr-tor-bg-img" src="modules/${CR_ID}/assets/Toreador1.jpg" decoding="async" alt="">
    <div class="cr-tor-bg"></div>
    <div class="cr-tor-bg-decor">${quoteHtml}</div>
    <div class="cr-tor-canvas">${img}</div>
    <div class="cr-tor-glow"></div>
    <div class="cr-tor-vignette"></div>
    <div class="cr-tor-petals">${petals}</div>
    <div class="cr-tor-text">
      <img class="cr-crest cr-crest--rose" src="modules/character-reveal/assets/Toreador_symbol.png" alt="">
      ${clanLabel ? `<div class="cr-tor-clan">✦ ${clanLabel.toUpperCase().split('').join(' ')} ✦</div>` : ''}
      ${name ? `<div class="cr-tor-name">${name}</div>` : ''}
      ${sub  ? `<div class="cr-tor-sub">${sub}</div>` : ''}
    </div>
  `;
}

// ─── Tzimisce/Tremere eyes — teleport while closed, never overlap ──────────────
function crTreSleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Shared registry of every live eye's VISIBLE box, keyed by id.
const _crTzeLive = new Map();
let   _crTzeNextId = 0;

// Find a screen spot whose visible ellipse clears the portrait and every other
// eye. Uses best-candidate sampling: among all non-overlapping candidates, pick
// the one FARTHEST from the nearest other eye — spreads eyes across the canvas
// instead of letting them clump. Returns {cL,cT,box} or null (keep old spot).
function crTzeFindSpot(W, H, selfId) {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const SW = window.innerWidth, SH = window.innerHeight;
  const pL = SW * 0.18, pR = SW * 0.82, pT = SH * 0.04, pB = SH * 0.78;
  const VIS_W = 0.74, VIS_H = 0.64, GAP = 18;     // visible part of the DOM box
  const vw = W * VIS_W, vh = H * VIS_H;

  // collect centres of all other live eyes
  const others = [];
  for (const [id, p] of _crTzeLive) {
    if (id !== selfId) others.push({ cx: p.x + p.w / 2, cy: p.y + p.h / 2 });
  }

  let best = null, bestDist = -1;
  for (let attempt = 0; attempt < 220; attempt++) {
    const cL = rnd(0, SW - W);
    const cT = rnd(0, SH - H);
    const vx = cL + (W - vw) / 2;
    const vy = cT + (H - vh) / 2;
    const cx = cL + W / 2, cy = cT + H / 2;
    if (cx > pL && cx < pR && cy > pT && cy < pB) continue;   // over portrait

    let ok = true, nearest = Infinity;
    for (const [id, p] of _crTzeLive) {
      if (id === selfId) continue;
      if (vx < p.x + p.w + GAP && vx + vw > p.x - GAP &&
          vy < p.y + p.h + GAP && vy + vh > p.y - GAP) { ok = false; break; }
    }
    if (!ok) continue;

    for (const o of others) {
      const d = (cx - o.cx) ** 2 + (cy - o.cy) ** 2;
      if (d < nearest) nearest = d;
    }
    if (nearest > bestDist) {
      bestDist = nearest;
      best = { cL, cT, box: { x: vx, y: vy, w: vw, h: vh } };
    }
  }
  return best;
}

function crTreBlink(wrap) {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const id  = ++_crTzeNextId;

  function lids(closed, speedS, ease) {
    const val     = closed ? 'scaleY(1)' : 'scaleY(0.2)';
    const defEase = closed ? 'cubic-bezier(0.85,0,1,0.5)' : 'cubic-bezier(0.25,0,0.5,1)';
    const easeVal = ease || defEase;
    wrap.querySelectorAll('.cr-tre-lid-top,.cr-tre-lid-bot').forEach(el => {
      el.style.transition = `transform ${speedS}s ${easeVal}`;
      el.style.transform  = val;
    });
    wrap.style.transition = `opacity ${speedS}s ${easeVal}`;
    wrap.style.opacity    = closed ? '0' : '1';
  }

  // Teleport to a fresh free spot (called only while the eye is shut & invisible).
  // If nothing is free, keep the current spot so eyes never stack.
  function relocate() {
    const W = wrap.offsetWidth  || 140;
    const H = wrap.offsetHeight || 60;
    const spot = crTzeFindSpot(W, H, id);
    if (!spot) return;
    _crTzeLive.set(id, spot.box);
    wrap.style.transition = 'none';
    wrap.style.transform  = `translate(${spot.cL.toFixed(1)}px, ${spot.cT.toFixed(1)}px)`;
  }

  relocate();   // initial position, set synchronously so siblings see it

  async function loop() {
    await crTreSleep(rnd(200, 2200));              // staggered first open
    while (wrap.isConnected) {
      lids(false, rnd(0.22, 0.50), 'cubic-bezier(0.15,0,0.35,1)');
      await crTreSleep(rnd(3500, 7000));           // hold open
      if (!wrap.isConnected) break;

      if (Math.random() < 0.6) {                   // occasional double-blink
        lids(true,  0.14, 'cubic-bezier(0.8,0,1,0.4)');
        await crTreSleep(200);
        if (!wrap.isConnected) break;
        lids(false, 0.20, 'cubic-bezier(0.1,0,0.35,1)');
        await crTreSleep(rnd(500, 1800));
        if (!wrap.isConnected) break;
      }

      const closeMs = rnd(600, 1100);
      lids(true, closeMs / 1000, 'cubic-bezier(0.4,0,0.6,1)');
      await crTreSleep(closeMs + 120);             // wait until fully shut
      if (!wrap.isConnected) break;
      relocate();                                  // move while invisible
      await crTreSleep(rnd(800, 2600));            // stay shut at new spot
      if (!wrap.isConnected) break;                // next iteration opens here
    }
    _crTzeLive.delete(id);
  }

  loop().catch(() => _crTzeLive.delete(id));
}

// ─── Style: VTM Tremere ───────────────────────────────────────────────────────
// Blood sorcery: a ritual circle of hermetic sigils turns around the figure,
// crimson light pulses like a heartbeat, large glyphs flicker across the frame.
// Tremere descend from the Order of Hermes; their Thaumaturgy is medieval
// ceremonial magic — so the glyphs are planetary, zodiacal & alchemical,
// the actual language of hermetic ritual, not Norse runes.
const CR_TRE_RUNES = [
  // Seven classical planets + outer
  '☉','☽','☿','♀','♂','♃','♄','♅','♆',
  // Zodiac
  '♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓',
  // Lunar nodes, dark moon, aspects, pentacle
  '☊','☋','⚸','⚹','☌','☍','⛤',
  // Alchemical elements & prime substances
  '🜁','🜂','🜃','🜄','🜍','🜔','🜚','🜛','🜞','🜟',
];

// Tremere V5 disciplines + hermetic invocations (grimoire Latin, V for U)
const CR_TRE_WORDS = [
  'SANGVIS', 'VITAE', 'THAVMATVRGIA', 'ORDO HERMETICVS',
  'AVSPEX', 'DOMINATE', 'BLOOD SORCERY', 'PER SANGVINEM',
  'SCIENTIA POTENTIA EST', 'SANGVINIS POTENTIA', 'TREMERE',
];

function crHtmlVtmTremere(img, name, cls, custom, showClan, clan) {
  const sub = [cls, custom].filter(Boolean).join(' · ');
  const clanLabel = showClan ? (clan || 'TREMERE') : null;

  // Sigils evenly spaced around the rotating outer ring
  const ringCount = 12;
  const sigils = Array.from({ length: ringCount }, (_, i) => {
    const a  = (360 / ringCount) * i;
    const ch = CR_TRE_RUNES[(i * 2) % CR_TRE_RUNES.length];
    return `<span class="cr-tre-sigil" style="--a:${a}deg">${ch}</span>`;
  }).join('');

  // Alchemical glyphs drifting up through the dark
  const floats = Array.from({ length: 9 }, (_, i) => {
    const x   = (6 + i * 10.5).toFixed(0);
    const ch  = CR_TRE_RUNES[(i * 5 + 3) % CR_TRE_RUNES.length];
    const del = (i * 0.8).toFixed(1);
    const dur = (9 + (i % 4) * 2.5).toFixed(1);
    const sz  = (0.8 + (i % 3) * 0.55).toFixed(2);
    return `<span class="cr-tre-float" style="--x:${x}%;--del:${del}s;--dur:${dur}s;--sz:${sz}rem">${ch}</span>`;
  }).join('');

  const rnd = (a, b) => a + Math.random() * (b - a);

  // Large casting glyphs flickering into being — kept to the side bands and top
  // strip so they frame the figure instead of covering the portrait.
  const runes = Array.from({ length: 16 }, () => {
    const r = Math.random();
    let x, y;
    if      (r < 0.42) { x = rnd(1, 15);  y = rnd(4, 92); }   // left band
    else if (r < 0.84) { x = rnd(85, 99); y = rnd(4, 92); }   // right band
    else               { x = rnd(20, 80); y = rnd(1, 5);  }   // top strip
    const sz  = (Math.pow(Math.random(), 1.8) * 7 + 2.4).toFixed(2);  // 2.4–9.4rem, weighted small
    const del = rnd(0, 7).toFixed(1);
    const dur = rnd(4, 9).toFixed(1);
    const rot = rnd(-26, 26).toFixed(0);
    const ch  = CR_TRE_RUNES[Math.floor(Math.random() * CR_TRE_RUNES.length)];
    return `<span class="cr-tre-rune" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;--sz:${sz}rem;--del:${del}s;--dur:${dur}s;--rot:${rot}deg">${ch}</span>`;
  }).join('');

  // Latin invocations & discipline names — kept to the top and bottom strips,
  // clear of the portrait, flickering like grimoire script.
  const words = Array.from({ length: 5 }, (_, i) => {
    const top = i % 2 === 0;
    const x   = rnd(14, 60).toFixed(1);
    const y   = (top ? rnd(1.5, 5) : rnd(76, 80)).toFixed(1);
    const del = rnd(0, 8).toFixed(1);
    const dur = rnd(8, 13).toFixed(1);
    const rot = rnd(-7, 7).toFixed(0);
    const w   = CR_TRE_WORDS[Math.floor(Math.random() * CR_TRE_WORDS.length)];
    return `<span class="cr-tre-word" style="left:${x}%;top:${y}%;--del:${del}s;--dur:${dur}s;--rot:${rot}deg">${w}</span>`;
  }).join('');

  return `
    <div class="cr-tre-bg"></div>
    <div class="cr-tre-glow"></div>
    <div class="cr-tre-ring cr-tre-ring--o"><div class="cr-tre-sigils">${sigils}</div></div>
    <div class="cr-tre-ring cr-tre-ring--m"></div>
    <div class="cr-tre-ring cr-tre-ring--i"></div>
    <div class="cr-tre-floats">${floats}</div>
    <div class="cr-tre-portrait">${img}</div>
    <div class="cr-tre-runes">${runes}${words}</div>
    <div class="cr-tre-vignette"></div>
    <div class="cr-tre-text">
      <img class="cr-crest cr-crest--blood" src="modules/character-reveal/assets/Tremere_symbol.png" alt="">
      ${clanLabel ? `<div class="cr-tre-clan">✦ ${clanLabel.toUpperCase().split('').join(' ')} ✦</div>` : ''}
      ${name ? `<div class="cr-tre-name">${name}</div>` : ''}
      ${sub  ? `<div class="cr-tre-sub">${sub}</div>` : ''}
    </div>
  `;
}

// ─── Tzimisce eye builder (shared eye-building logic) ─────────────────────────
function _crBuildTziEyes() {
  const maxEyeW = Math.round(window.innerWidth  * 0.16);
  const maxEyeH = Math.round(window.innerHeight * 0.19);
  const eyeDefs = [
    { bw: 300, bh: 130 },
    { bw: 560, bh: 241 },
    { bw: 680, bh: 293 },
    { bw: 420, bh: 181 },
    { bw: 480, bh: 207 },
    { bw: 360, bh: 155 },
    { bw: 280, bh: 120 },
    { bw: 540, bh: 233 },
    { bw: 640, bh: 275 },
    { bw: 400, bh: 172 },
    { bw: 460, bh: 198 },
    { bw: 340, bh: 146 },
  ];
  const irisImg = 'modules/character-reveal/assets/png-transparent-human-eye-iris-lens-color-dente-photography-people-human-body-thumbnail.png';

  const eyes = eyeDefs.map((e, i) => {
    const rnd = (a, b) => a + Math.random() * (b - a);
    const scale = 0.35 + Math.random() * 0.47;
    const w = Math.min(Math.round(e.bw * scale), maxEyeW);
    const h = Math.min(Math.round(e.bh * scale), maxEyeH);
    const cid = `tre-ec-${i}-${Math.random().toString(36).slice(2, 7)}`;

    // Randomise eye shape — different bezier points per eye
    const cy   = rnd(37, 44);           // vertical centre
    const uy   = rnd(6,  18);           // upper arch apex Y (shallower ↔ deeper)
    const ly   = rnd(56, 72);           // lower arch nadir Y
    const lx1  = rnd(38, 68);           // lower-arch left control X
    const lx2  = 200 - rnd(38, 68);    // lower-arch right control X
    const ulx1 = rnd(40, 65);           // upper-arch left control X (different = asymmetry)
    const ulx2 = 200 - rnd(40, 65);
    const eyePath = `M0,${cy.toFixed(1)} C${ulx1.toFixed(1)},${uy.toFixed(1)} ${ulx2.toFixed(1)},${uy.toFixed(1)} 200,${cy.toFixed(1)} C${lx2.toFixed(1)},${ly.toFixed(1)} ${lx1.toFixed(1)},${ly.toFixed(1)} 0,${cy.toFixed(1)} Z`;

    // Curved lid paths — bottom/top edge follows the eyelid margin curve, not a straight line
    const topMeet = cy + rnd(6, 12);    // where top lid reaches at the corners
    const topDip  = cy + rnd(2, 6);    // top lid edge at the middle — below center so lids overlap
    const botMeet = cy - rnd(6, 12);   // where bottom lid reaches at the corners
    const botRise = cy - rnd(2, 6);    // bottom lid edge at the middle — above center so lids overlap
    const topLidPath = `M-5,${topMeet.toFixed(1)} C60,${topDip.toFixed(1)} 140,${topDip.toFixed(1)} 205,${topMeet.toFixed(1)} L205,-5 L-5,-5 Z`;
    const botLidPath = `M-5,${botMeet.toFixed(1)} C60,${botRise.toFixed(1)} 140,${botRise.toFixed(1)} 205,${botMeet.toFixed(1)} L205,85 L-5,85 Z`;

    // Bloodshot veins — thin red threads creeping from the corners toward the pupil
    const veins = Array.from({ length: 4 + Math.floor(Math.random() * 3) }, () => {
      const fromL = Math.random() < 0.5;
      const sx = fromL ? 0 : 200;
      const sy = rnd(cy - 16, cy + 16);
      const mx = fromL ? rnd(25, 78) : rnd(122, 175);
      const my = rnd(cy - 13, cy + 13);
      return `<path d="M${sx},${sy.toFixed(0)} Q${mx.toFixed(0)},${my.toFixed(0)} 100,${cy.toFixed(0)}" stroke="rgba(150,26,16,.55)" stroke-width="${rnd(0.3, 0.8).toFixed(2)}" fill="none"/>`;
    }).join('');

    return `
      <div class="cr-tre-eye-wrap" style="width:${w}px;height:${h}px">
        <svg class="cr-tre-eye-svg" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <clipPath id="${cid}">
              <path d="${eyePath}"/>
            </clipPath>
            <clipPath id="${cid}-c">
              <circle cx="100" cy="${cy.toFixed(1)}" r="38"/>
            </clipPath>
            <radialGradient id="${cid}-rg" cx="50%" cy="${((cy/80)*100).toFixed(1)}%" r="55%">
              <stop offset="25%" stop-color="rgba(0,0,0,0)"/>
              <stop offset="100%" stop-color="rgba(20,0,0,0.92)"/>
            </radialGradient>
          </defs>
          <g clip-path="url(#${cid})">
            <rect width="200" height="80" fill="#240807"/>
            ${veins}
            <image href="${irisImg}" x="60" y="${(cy-40).toFixed(1)}" width="80" height="80" preserveAspectRatio="xMidYMid meet" clip-path="url(#${cid}-c)"/>
            <circle cx="100" cy="${cy.toFixed(1)}" r="38" fill="rgba(140,20,10,0.34)" clip-path="url(#${cid}-c)"/>
            <rect width="200" height="80" fill="url(#${cid}-rg)"/>
            <ellipse cx="82" cy="${(cy-17).toFixed(1)}" rx="5" ry="2.5" fill="rgba(255,235,225,.16)" transform="rotate(-15 82 ${(cy-17).toFixed(1)})"/>
            <path class="cr-tre-lid-top" d="${topLidPath}" fill="#1a0504"/>
            <path class="cr-tre-lid-bot" d="${botLidPath}" fill="#1a0504"/>
          </g>
          <path d="${eyePath}" fill="none" stroke="transparent" stroke-width="3"/>
        </svg>
      </div>`;
  }).join('');

  return eyes;
}

// ─── Style: VTM Nosferatu ──────────────────────────────────────────────────────
function crHtmlVtmNosferatu(img, name, cls, custom, showClan, clan) {
  const sub = [cls, custom].filter(Boolean).join(' · ');
  const clanLabel = showClan ? (clan || 'NOSFERATU') : null;
  return `
    <div class="cr-nos-bg">${img}</div>
    <div class="cr-nos-darkness"></div>
    <div class="cr-nos-glow"></div>
    <div class="cr-nos-vignette"></div>
    <div class="cr-nos-text">
      <img class="cr-crest cr-crest--shadow" src="modules/character-reveal/assets/Nosferatu_symbol.png" alt="">
      ${clanLabel ? `<div class="cr-nos-clan">⌇ ${clanLabel.toUpperCase()} ⌇</div>` : ''}
      ${name ? `<div class="cr-nos-name">${name}</div>` : ''}
      ${sub  ? `<div class="cr-nos-sub">${sub}</div>` : ''}
    </div>
  `;
}

// ─── Style: VTM Gangrel ────────────────────────────────────────────────────────
function crHtmlVtmGangrel(img, name, cls, custom, showClan, clan) {
  const sub = [cls, custom].filter(Boolean).join(' · ');
  const clanLabel = showClan ? (clan || 'GANGREL') : null;
  return `
    <div class="cr-gan-bg"></div>
    <div class="cr-gan-wolf"></div>
    <div class="cr-gan-portrait">${img}</div>
    <div class="cr-gan-mist"></div>
    <div class="cr-gan-moon-ground"></div>
    <div class="cr-gan-forest"></div>
    <div class="cr-gan-ground"></div>
    <div class="cr-gan-vignette"></div>
    <div class="cr-gan-text">
      <img class="cr-crest cr-crest--earth" src="modules/character-reveal/assets/Gangrel_symbol.png" alt="">
      ${clanLabel ? `<div class="cr-gan-clan">— ${clanLabel.toUpperCase()} —</div>` : ''}
      ${name ? `<div class="cr-gan-name">${name}</div>` : ''}
      ${sub  ? `<div class="cr-gan-sub">${sub}</div>` : ''}
    </div>
  `;
}

// ─── Style: VTM Brujah ────────────────────────────────────────────────────────
function crHtmlVtmBrujah(img, name, cls, custom, showClan, clan) {
  const sub = [cls, custom].filter(Boolean).join(' · ');
  const clanLabel = showClan ? (clan || 'BRUJAH') : null;

  // Sparks fly in varied directions: angle from vertical, dist = travel radius
  const sparks = Array.from({length: 30}, (_, i) => {
    const angle = ((i * 47) % 180) - 90;
    const dist  = 80 + (i % 5) * 35;
    const dx    = Math.round(Math.sin(angle * Math.PI / 180) * dist);
    const dy    = -Math.round(Math.cos(angle * Math.PI / 180) * dist + 55);
    const x     = (3 + (i % 15) * 6.5).toFixed(1);
    const sy    = (2 + (i % 6) * 3).toFixed(0);
    const del   = (i * 0.10).toFixed(2);
    const dur   = (0.6 + (i % 6) * 0.19).toFixed(2);
    const sz    = i % 5 === 0 ? 4 : i % 5 === 1 ? 3 : 2;
    return `<div class="cr-brj-spark" style="--x:${x}%;--dx:${dx}px;--dy:${dy}px;--sy:${sy}%;--delay:${del}s;--dur:${dur}s;--sz:${sz}px"></div>`;
  }).join('');

  // Smoke wisps rising from the fire
  const smokes = Array.from({length: 7}, (_, i) => {
    const x   = (6 + i * 13).toFixed(0);
    const ddx = ((i % 3) - 1) * 45;
    const del = (i * 0.65 + 0.25).toFixed(2);
    const dur = (6 + i).toFixed(1);
    const sz  = (80 + (i % 3) * 55).toFixed(0);
    return `<div class="cr-brj-smoke" style="--x:${x}%;--ddx:${ddx}px;--delay:${del}s;--dur:${dur}s;--sz:${sz}px"></div>`;
  }).join('');

  return `
    <div class="cr-brj-bg"></div>
    <img class="cr-brj-graffiti" src="modules/character-reveal/assets/brujah graffiti2.jpg" alt="">
    <div class="cr-brj-portrait">${img}</div>
    <div class="cr-brj-fire">
      <div class="cr-brj-fire-base"></div>
      <div class="cr-brj-flame cr-brj-fl--1"></div>
      <div class="cr-brj-flame cr-brj-fl--2"></div>
      <div class="cr-brj-flame cr-brj-fl--3"></div>
      <div class="cr-brj-flame cr-brj-fl--4"></div>
      <div class="cr-brj-flame cr-brj-fl--5"></div>
      <div class="cr-brj-flame cr-brj-fl--6"></div>
      <div class="cr-brj-flame cr-brj-fl--7"></div>
      <div class="cr-brj-flame cr-brj-fl--8"></div>
    </div>
    <div class="cr-brj-vignette"></div>
    <div class="cr-brj-smokes">${smokes}</div>
    <div class="cr-brj-sparks">${sparks}</div>
    <div class="cr-brj-strobes"></div>
    <div class="cr-brj-uv"></div>
    <div class="cr-brj-glyphs">
      <div class="cr-brj-glyph"           style="--gx:7%;  --gy:11%; --del:1.2s; --gdur:10s">ANARCH</div>
      <div class="cr-brj-glyph cr-brj-gb" style="--gx:70%; --gy:8%;  --del:2.4s; --gdur:8.5s">REVOLT</div>
      <div class="cr-brj-glyph"           style="--gx:4%;  --gy:44%; --del:3.6s; --gdur:12s">BRUJAH</div>
      <div class="cr-brj-glyph cr-brj-gb" style="--gx:72%; --gy:52%; --del:1.8s; --gdur:9.3s">NO MASTERS</div>
      <div class="cr-brj-glyph"           style="--gx:35%; --gy:5%;  --del:2.8s; --gdur:11s">BEAST WITHIN</div>
      <div class="cr-brj-glyph cr-brj-gb" style="--gx:6%;  --gy:70%; --del:4.1s; --gdur:13s">FRENZY</div>
      <div class="cr-brj-glyph"           style="--gx:66%; --gy:74%; --del:3.0s; --gdur:8s">RAGE</div>
      <div class="cr-brj-glyph cr-brj-gb" style="--gx:44%; --gy:36%; --del:5.2s; --gdur:9.8s">FREEDOM</div>
    </div>
    <div class="cr-brj-text">
      <img class="cr-crest cr-crest--fire" src="modules/character-reveal/assets/Brujah_symbol.png" alt="">
      ${clanLabel ? `<div class="cr-brj-clan">${clanLabel.toUpperCase()}</div>` : ''}
      ${name ? `<div class="cr-brj-name">${name}</div>` : ''}
      ${sub  ? `<div class="cr-brj-sub">${sub}</div>` : ''}
    </div>
  `;
}

// ─── Style: VTM Lasombra ──────────────────────────────────────────────────────
// Obtenebration — cast shadows playing on a dim-lit wall. The background is a
// faintly lit surface; dark shadow shapes crawl across it BEHIND the figure
// (so they read as real shadows, not a veil over the token), while only faint
// shadow falls onto the figure and a cold light wanders so they "play".
function crHtmlVtmLasombra(img, name, cls, custom, showClan, clan) {
  const sub = [cls, custom].filter(Boolean).join(' · ');
  const clanLabel = showClan ? (clan || 'LASOMBRA') : null;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Arms of the Abyss — each tentacle is ONE filled SVG path (a tapering ribbon
  // bent into an S). Its `d` morphs between phase-shifted shapes via SMIL, so a
  // wave runs along it and it writhes as a single continuous shape — cheap
  // (8 paths, not 100+ divs), smooth, and clearly a tentacle, not grass.
  // Coords are in a 0–100 viewBox stretched to the screen (≈ percent).
  const tentPath = (bx, by, ang, len, wid, phase, waves, curl) => {
    const N = 16, a = ang * Math.PI / 180, pa = a + Math.PI / 2;
    const dx = Math.cos(a), dy = Math.sin(a), px = Math.cos(pa), py = Math.sin(pa);
    const Lp = [], Rp = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const dist = t * len;
      const bend = Math.sin(t * Math.PI * waves + phase) * curl * t;
      const cx = bx + dx * dist + px * bend;
      const cy = by + dy * dist + py * bend;
      const hw = wid * (1 - t * 0.94) / 2;
      Lp.push([cx - px * hw, cy - py * hw]);
      Rp.push([cx + px * hw, cy + py * hw]);
    }
    let d = `M${Lp[0][0].toFixed(1)},${Lp[0][1].toFixed(1)}`;
    for (let i = 1; i <= N; i++) d += `L${Lp[i][0].toFixed(1)},${Lp[i][1].toFixed(1)}`;
    for (let i = N; i >= 0; i--) d += `L${Rp[i][0].toFixed(1)},${Rp[i][1].toFixed(1)}`;
    return d + 'Z';
  };
  // 36 tentacles, fully randomised so nothing moves in sync. Origins spread
  // across the bottom edge and the two sides, each with its own length, width,
  // speed, wave count, curl and starting phase.
  const TWO_PI = Math.PI * 2;
  const tentDefs = Array.from({ length: 36 }, () => {
    const r = Math.random();
    let bx, by, ang;
    if (r < 0.62) {                 // up from the bottom edge
      bx = rnd(0, 100); by = rnd(102, 114); ang = -90 + rnd(-24, 24);
    } else if (r < 0.81) {          // in from the left
      bx = rnd(-6, 2);  by = rnd(32, 96);  ang = -40 + rnd(-22, 22);
    } else {                        // in from the right
      bx = rnd(98, 106); by = rnd(32, 96); ang = -140 + rnd(-22, 22);
    }
    // Keep central tentacles short so they don't rise up through the portrait
    // (whose mask edges are transparent) and appear to stand in front of it.
    const central = bx > 26 && bx < 74;
    return {
      bx, by, ang,
      len:   central ? rnd(26, 44) : rnd(40, 68),
      wid:   rnd(7, 16),
      dur:   rnd(24, 62),           // wide spread of speeds → no shared cycle
      waves: rnd(1.4, 2.3),
      curl:  rnd(13, 24),
      ph:    rnd(0, TWO_PI),
    };
  });
  const tentacles = tentDefs.map((d) => {
    const phs = [d.ph, d.ph + Math.PI * 0.66, d.ph + Math.PI * 1.33, d.ph + Math.PI * 2];
    const vals = phs.map(p => tentPath(d.bx, d.by, d.ang, d.len, d.wid, p, d.waves, d.curl)).join(';');
    const del = (rnd(0, 8)).toFixed(2);                       // staggered emergence
    return `<path class="cr-las-arm" style="--del:${del}s" d="${vals.split(';')[0]}">`
         + `<animate attributeName="d" values="${vals}" dur="${d.dur}s" calcMode="spline"`
         + ` keyTimes="0;0.33;0.66;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"`
         + ` repeatCount="indefinite"/></path>`;
  }).join('');

  // A few distant bats far back in the gloom — small, faint, slow
  const bats = Array.from({ length: 3 }, () => {
    const y = rnd(8, 58).toFixed(1);
    const sz = rnd(1.2, 2.2).toFixed(2);
    const dur = rnd(13, 20).toFixed(1);
    const del = rnd(0, 12).toFixed(1);
    const drift = rnd(-10, 10).toFixed(0);
    const flap = rnd(0.4, 0.6).toFixed(2);
    return `<span class="cr-las-bat" style="top:${y}%;--sz:${sz}rem;--dur:${dur}s;--del:${del}s;--drift:${drift}vh;--op:0.28;--blur:4px;--flap:${flap}s">`
         + `<span class="cr-las-bat-i">🦇</span></span>`;
  }).join('');

  return `
    <div class="cr-las-wall"></div>
    <div class="cr-las-glint"></div>
    <div class="cr-las-bats">${bats}</div>
    <svg class="cr-las-tentacles" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cr-las-tgrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0"   stop-color="rgba(1,0,4,0.96)"/>
          <stop offset="0.55" stop-color="rgba(2,0,6,0.6)"/>
          <stop offset="1"   stop-color="rgba(2,0,6,0.05)"/>
        </linearGradient>
      </defs>
      ${tentacles}
    </svg>
    <div class="cr-las-portrait">${img}</div>
    <div class="cr-las-cast cr-las-cast--1"></div>
    <div class="cr-las-vignette"></div>
    <div class="cr-las-text">
      <img class="cr-crest cr-crest--void" src="modules/character-reveal/assets/Lasombra_symbol.png" alt="">
      ${clanLabel ? `<div class="cr-las-clan">— ${clanLabel.toUpperCase()} —</div>` : ''}
      ${name ? `<div class="cr-las-name">${name}</div>` : ''}
      ${sub  ? `<div class="cr-las-sub">${sub}</div>` : ''}
    </div>
  `;
}

// ─── Style: VTM Tzimisce ─────────────────────────────────────────────────────
// ─── Style: VTM Hecata ───────────────────────────────────────────────────────
function crHtmlVtmHecata(img, name, cls, custom, showClan, clan) {
  const sub = [cls, custom].filter(Boolean).join(' · ');
  const clanLabel = showClan ? (clan || 'HECATA') : null;
  const wisps = Array.from({length: 7}, (_, i) => {
    const x   = (5 + (i * 13 + 7) % 88).toFixed(0);
    const del = (i * 0.6).toFixed(1);
    const dur = (4 + (i % 3) * 1.5).toFixed(1);
    return `<div class="cr-hec-wisp" style="--x:${x}%;--del:${del}s;--dur:${dur}s"></div>`;
  }).join('');
  return `
    <div class="cr-hec-bg"></div>
    <div class="cr-hec-portrait">${img}</div>
    <div class="cr-hec-wisps">${wisps}</div>
    <div class="cr-hec-vignette"></div>
    <div class="cr-hec-text">
      <img class="cr-crest cr-crest--bone" src="modules/character-reveal/assets/Hecata_symbol.png" alt="">
      ${clanLabel ? `<div class="cr-hec-clan">— ${clanLabel.toUpperCase()} —</div>` : ''}
      ${name ? `<div class="cr-hec-name">${name}</div>` : ''}
      ${sub  ? `<div class="cr-hec-sub">${sub}</div>` : ''}
    </div>
  `;
}

// ─── Style: VTM Banu Haqim ───────────────────────────────────────────────────
function crHtmlVtmTzimisce(img, name, cls, custom, showClan, clan) {
  const sub = [cls, custom].filter(Boolean).join(' · ');
  const clanLabel = showClan ? (clan || 'TZIMISCE') : null;
  const eyes = _crBuildTziEyes();
  return `
    <svg class="cr-tzi-filters" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="cr-tzi-flesh" x="-60%" y="-60%" width="220%" height="220%">
          <feTurbulence type="turbulence" baseFrequency="0.010 0.016" numOctaves="2" seed="7" result="noise">
            <animate attributeName="baseFrequency"
              values="0.010 0.016;0.015 0.011;0.008 0.020;0.013 0.013;0.010 0.016"
              dur="200s" repeatCount="indefinite"/>
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="16" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <filter id="cr-tzi-eye-warp" x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.028 0.04" numOctaves="2" seed="11" result="en">
            <animate attributeName="baseFrequency"
              values="0.028 0.04;0.045 0.028;0.022 0.05;0.034 0.034;0.028 0.04"
              dur="13s" repeatCount="indefinite"/>
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="en" scale="7" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
    </svg>
    <div class="cr-tzi-bg"></div>
    <img class="cr-tzi-bg-img" src="modules/character-reveal/assets/tzimisce back.png" alt="">
    <div class="cr-tre-eyes">${eyes}</div>
    <div class="cr-tzi-portrait">${img}</div>
    <div class="cr-tzi-vignette"></div>
    <div class="cr-tzi-text">
      <img class="cr-crest cr-crest--flesh" src="modules/character-reveal/assets/Tzimisce_symbol.png" alt="">
      ${clanLabel ? `<div class="cr-tzi-clan">— ${clanLabel.toUpperCase()} —</div>` : ''}
      ${name ? `<div class="cr-tzi-name">${name}</div>` : ''}
      ${sub  ? `<div class="cr-tzi-sub">${sub}</div>` : ''}
    </div>
  `;
}

