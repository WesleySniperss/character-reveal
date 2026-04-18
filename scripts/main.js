// ═══════════════════════════════════════════════════════════════
// CHARACTER REVEAL — main.js
// Foundry VTT v13 · no import/export (classic script)
// ═══════════════════════════════════════════════════════════════

const CR_ID = 'character-reveal';

const CR_STYLES = [
  { id: 'minimal',     label: 'Minimal',     icon: 'fa-circle-half-stroke' },
  { id: 'tarantino',   label: 'Tarantino',   icon: 'fa-film' },
  { id: 'wantedpost',  label: 'One Piece',   icon: 'fa-scroll' },
  { id: 'borderlands', label: 'Borderlands', icon: 'fa-bomb' },
  { id: 'heraldry',    label: 'Heraldry',    icon: 'fa-shield-halved' },
  { id: 'darksouls',   label: 'Dark Souls',  icon: 'fa-skull' },
  { id: 'manuscript',  label: 'Manuscript',  icon: 'fa-book-open' },
  { id: 'spotlight',   label: 'Spotlight',   icon: 'fa-star' },
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
  reg('customText', '');
  reg('soundFile',  '');
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
  game.socket.on(`module.${CR_ID}`, data => {
    if (data.action === 'reveal') crShowOverlay(data);
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
          <label class="cr-toggle">
            <input type="checkbox" name="cr-showClass" ${g('showClass') ? 'checked' : ''}>
            <span>Class / Subclass</span>
          </label>
        </div>

        <div class="cr-field-label">Custom text <em>(optional)</em></div>
        <input type="text" name="cr-customText" class="cr-input"
               value="${g('customText')}"
               placeholder="e.g. «The legend returns»">

        <div class="cr-field-label">Sound</div>
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
    });

    html.find('.cr-btn--cancel').on('click', () => this.close());
    html.find('.cr-btn--reveal').on('click', () => this._doReveal(html));
  }

  async _doReveal(html) {
    const root       = this.element;
    const style      = root.find('[name="cr-style"]:checked').val() || 'minimal';
    const showName   = root.find('[name="cr-showName"]').is(':checked');
    const showClass  = root.find('[name="cr-showClass"]').is(':checked');
    const customText = root.find('[name="cr-customText"]').val().trim();
    console.log(`${CR_ID} | _doReveal values:`, { style, showName, showClass, customText });

    await Promise.all([
      game.settings.set(CR_ID, 'style',      style),
      game.settings.set(CR_ID, 'showName',   showName),
      game.settings.set(CR_ID, 'showClass',  showClass),
      game.settings.set(CR_ID, 'customText', customText),
    ]);

    const actor = this.actor;
    const payload = {
      action:       'reveal',
      style,
      showName,
      showClass,
      customText,
      actorImg:       actor.img  || 'icons/svg/mystery-man.svg',
      actorName:      actor.name || '',
      actorIsNPC:     actor.type === 'npc' || actor.type === 'monster',
      actorClass:     crGetClass(actor),
      actorSubclass:  crGetSubclass(actor),
      actorRace:      crGetRace(actor),
      actorCR:        actor.system?.details?.cr ?? '',
      actorAlignment: actor.system?.details?.alignment || '',
    };

    // Resolve sound on GM side, then broadcast with src included
    payload.soundSrc = await crResolveSoundSrc(style);
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

function crShowOverlay(data) {
  crPlaySound(data.soundSrc || null);

  document.getElementById('cr-overlay')?.remove();

  const el = document.createElement('div');
  el.id = 'cr-overlay';
  el.dataset.style = data.style;
  el.innerHTML = crBuildHTML(data) +
    '<div class="cr-dismiss-hint">click anywhere to close</div>' +
    `<button class="cr-mute-btn ${crIsMuted() ? 'cr-mute-btn--off' : ''}" title="Toggle sound">
       <i class="fas ${crIsMuted() ? 'fa-volume-xmark' : 'fa-volume-high'}"></i>
     </button>`;

  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('cr-visible'));

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

  el.addEventListener('click', dismiss);

  const onKey = e => {
    if (e.key === 'Escape') { dismiss(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);
}

// ─── Master HTML builder ────────────────────────────────────────────────────────
function crBuildHTML(data) {
  const { style, showName, showClass, customText, actorImg, actorName,
          actorClass, actorSubclass, actorRace, actorIsNPC, actorCR, actorAlignment } = data;

  const name   = showName  ? (actorName  || '') : '';
  const custom = customText || '';
  const img    = `<img class="cr-portrait-img" src="${actorImg}" alt="${actorName}">`;

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
    default:            return crHtmlMinimal(img, name, cls, custom, actorImg);
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
  return `
    <div class="cr-ta-grain"></div>
    <div class="cr-ta-scanlines"></div>
    <div class="cr-ta-bar"></div>
    <div class="cr-ta-inner">
      <div class="cr-ta-img">${img}</div>
      <div class="cr-ta-copy">
        ${custom ? `<div class="cr-ta-sub">${custom}</div>` : ''}
        ${name   ? `<div class="cr-ta-name">${name}</div>` : ''}
        ${cls    ? `<div class="cr-ta-div"></div><div class="cr-ta-class">${cls}</div>` : ''}
      </div>
    </div>
  `;
}

// ─── Style: Wanted Poster ──────────────────────────────────────────────────────
function crHtmlWanted(img, name, cls, custom) {
  return `
    <div class="cr-op-rays"></div>
    <div class="cr-op-poster">
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
  return `
    <div class="cr-her-torches">
      <div class="cr-her-torch cr-her-torch--left">
        <div class="cr-her-torch-glow"></div>
        <div class="cr-her-torch-fire"></div>
        <div class="cr-her-torch-body"></div>
      </div>
      <div class="cr-her-torch cr-her-torch--right">
        <div class="cr-her-torch-glow"></div>
        <div class="cr-her-torch-fire"></div>
        <div class="cr-her-torch-body"></div>
      </div>
    </div>
    <div class="cr-her-banner-wrap">
      <div class="cr-her-banner-top"></div>
      <div class="cr-her-banner-body">
        <div class="cr-her-ring">${img}</div>
        <div class="cr-her-ornament">— ✦ —</div>
        ${name   ? `<div class="cr-her-name">${name}</div>`   : ''}
        ${cls    ? `<div class="cr-her-title">${cls}</div>`   : ''}
        ${custom ? `<div class="cr-her-divider"></div><div class="cr-her-desc">${custom}</div>` : ''}
      </div>
      <div class="cr-her-banner-tip"></div>
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
  const cap  = name ? name[0].toUpperCase() : '';
  const rest = name ? name.slice(1) : '';

  const bodyParts = [rest, cls ? `<em>${cls}</em>` : ''].filter(Boolean);
  const bodyContent = bodyParts.join('<br>');

  return `
    <div class="cr-ms-page">
      <div class="cr-ms-corner cr-ms-corner--tl"></div>
      <div class="cr-ms-corner cr-ms-corner--tr"></div>
      <div class="cr-ms-corner cr-ms-corner--bl"></div>
      <div class="cr-ms-corner cr-ms-corner--br"></div>
      <div class="cr-ms-header">Chronicle of the Realm</div>
      <div class="cr-ms-frame">${img}</div>
      ${cap         ? `<div class="cr-ms-cap">${cap}</div>` : ''}
      ${bodyContent ? `<div class="cr-ms-body">${bodyContent}</div>` : ''}
      ${custom      ? `<div class="cr-ms-quote">\u201c${custom}\u201d</div>` : ''}
      <hr class="cr-ms-ruling">
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
