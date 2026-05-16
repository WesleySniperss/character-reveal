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
  { id: 'anime',       label: 'Anime',       icon: 'fa-bolt' },
  { id: 'leone',        label: 'Leone',        icon: 'fa-eye' },
  { id: 'vtm-ventrue',   label: 'VTM Ventrue',   icon: 'fa-crown' },
  { id: 'vtm-malkavian', label: 'VTM Malkavian', icon: 'fa-brain' },
  { id: 'vtm-toreador',  label: 'VTM Toreador',  icon: 'fa-palette' },
  { id: 'vtm-nosferatu', label: 'VTM Nosferatu', icon: 'fa-eye-slash' },
  { id: 'vtm-gangrel',   label: 'VTM Gangrel',   icon: 'fa-paw' },
  { id: 'vtm-brujah',    label: 'VTM Brujah',    icon: 'fa-fist-raised' },
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
  const { style, showName, showClass, showClan, customText, actorImg, actorName,
          actorClass, actorSubclass, actorRace, actorIsNPC, actorCR, actorAlignment,
          actorClan } = data;

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
    case 'anime':       return crHtmlAnime(img, name, cls, custom);
    case 'leone':         return crHtmlLeone(img, name, cls, custom);
    case 'vtm-ventrue':   return crHtmlVtmVentrue(img, name, cls, custom, showClan, actorClan);
    case 'vtm-malkavian': return crHtmlVtmMalkavian(img, name, cls, custom, actorImg, showClan, actorClan);
    case 'vtm-toreador':  return crHtmlVtmToreador(img, name, cls, custom, showClan, actorClan);
    case 'vtm-nosferatu': return crHtmlVtmNosferatu(img, name, cls, custom, showClan, actorClan);
    case 'vtm-gangrel':   return crHtmlVtmGangrel(img, name, cls, custom, showClan, actorClan);
    case 'vtm-brujah':    return crHtmlVtmBrujah(img, name, cls, custom, showClan, actorClan);
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

// ─── Style: Anime ──────────────────────────────────────────────────────────────
function crHtmlAnime(img, name, cls, custom) {
  const sub = [cls, custom].filter(Boolean).join(' · ');
  return `
    <div class="cr-an-bg"></div>
    <div class="cr-an-lines"></div>
    <div class="cr-an-flash"></div>
    <div class="cr-an-ring">${img}</div>
    <div class="cr-an-bottom">
      <div class="cr-an-name-row">
        <span class="cr-an-chevron">▶▶</span>
        ${name ? `<span class="cr-an-name">${name}</span>` : ''}
        <span class="cr-an-chevron">◀◀</span>
      </div>
      ${sub ? `<div class="cr-an-sub">${sub}</div>` : ''}
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
    <div class="cr-vtv-frame">
      <div class="cr-vtv-line cr-vtv-line--top"></div>
      <div class="cr-vtv-line cr-vtv-line--left"></div>
      <div class="cr-vtv-line cr-vtv-line--right"></div>
      <div class="cr-vtv-line cr-vtv-line--bot"></div>
      <div class="cr-vtv-corner cr-vtv-corner--tl"></div>
      <div class="cr-vtv-corner cr-vtv-corner--tr"></div>
      <div class="cr-vtv-corner cr-vtv-corner--bl"></div>
      <div class="cr-vtv-corner cr-vtv-corner--br"></div>
    </div>
    <div class="cr-vtv-frame-overlay"></div>
    <svg class="cr-vtv-shimmer" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="cr-sv-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1.1"/>
        </filter>
      </defs>
      <rect x="15" y="5" width="70" height="90"
            fill="none" stroke="rgba(255,232,100,0.55)" stroke-width="3.5"
            filter="url(#cr-sv-glow)"
            stroke-dasharray="14 306" stroke-linecap="round" stroke-dashoffset="0">
        <animate attributeName="stroke-dashoffset" from="0" to="-320" dur="12s" begin="2.5s" repeatCount="indefinite"/>
      </rect>
      <rect x="15" y="5" width="70" height="90"
            fill="none" stroke="rgba(255,252,195,0.95)" stroke-width="0.5"
            stroke-dasharray="8 312" stroke-linecap="round" stroke-dashoffset="0">
        <animate attributeName="stroke-dashoffset" from="0" to="-320" dur="12s" begin="2.5s" repeatCount="indefinite"/>
      </rect>
    </svg>
    <div class="cr-vtv-text">
      ${clanLabel ? `<div class="cr-vtv-clan">✦ &nbsp; ${clanLabel.toUpperCase().split('').join(' ')} &nbsp; ✦</div>` : ''}
      ${name ? `<div class="cr-vtv-name">${name}</div>` : ''}
      ${sub  ? `<div class="cr-vtv-sub">${sub}</div>`   : ''}
    </div>
  `;
}

// ─── Style: VTM Malkavian ──────────────────────────────────────────────────────
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

  const CRACK_PATHS = `<g fill="none" stroke-linecap="butt"><path d="M 42,48 L 25,8 L 0,0" stroke="rgba(220,235,255,.82)" stroke-width="0.40"/><path d="M 25,8 L 14,0" stroke="rgba(220,235,255,.38)" stroke-width="0.18"/><path d="M 42,48 L 0,35" stroke="rgba(220,235,255,.75)" stroke-width="0.37"/><path d="M 42,48 L 8,88 L 0,88" stroke="rgba(220,235,255,.72)" stroke-width="0.34"/><path d="M 42,48 L 38,100" stroke="rgba(220,235,255,.68)" stroke-width="0.32"/><path d="M 42,48 L 72,95 L 68,100" stroke="rgba(220,235,255,.72)" stroke-width="0.34"/><path d="M 42,48 L 88,62 L 100,62" stroke="rgba(220,235,255,.68)" stroke-width="0.32"/><path d="M 42,48 L 60,5 L 72,28 L 100,18" stroke="rgba(220,235,255,.75)" stroke-width="0.37"/><path d="M 60,0 L 72,28" stroke="rgba(220,235,255,.44)" stroke-width="0.20"/><path d="M 42,48 L 42,0" stroke="rgba(220,235,255,.70)" stroke-width="0.34"/><path d="M 42,48 L 50,42 L 58,35" stroke="rgba(220,235,255,.42)" stroke-width="0.19"/><path d="M 42,48 L 36,42 L 28,36" stroke="rgba(220,235,255,.38)" stroke-width="0.17"/><path d="M 42,48 L 46,56 L 52,66" stroke="rgba(220,235,255,.38)" stroke-width="0.17"/><path d="M 42,48 L 35,54 L 28,62" stroke="rgba(220,235,255,.36)" stroke-width="0.16"/><path d="M 42,48 L 46,46" stroke="rgba(220,235,255,.58)" stroke-width="0.25"/><path d="M 42,48 L 38,46" stroke="rgba(220,235,255,.55)" stroke-width="0.24"/><path d="M 42,48 L 44,51" stroke="rgba(220,235,255,.53)" stroke-width="0.23"/><path d="M 42,48 L 40,51" stroke="rgba(220,235,255,.50)" stroke-width="0.22"/><path d="M 44,47 L 48,45" stroke="rgba(220,235,255,.46)" stroke-width="0.20"/><path d="M 40,49 L 36,51" stroke="rgba(220,235,255,.44)" stroke-width="0.19"/></g>`;
  const CRACK_SVG_PRE   = `<svg class="cr-vtm-precrack"          viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${CRACK_PATHS}</svg>`;
  const CRACK_SVG_SHARD = `<svg class="cr-vtm-shard-crack-static" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${CRACK_PATHS}</svg>`;

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
      ${CRACK_SVG_PRE}
    </div>
    ${shards}
    <div class="cr-vtm-noise"></div>
    <div class="cr-vtm-vignette"></div>
    <div class="cr-vtm-whispers">${whispers}</div>
    <div class="cr-vtm-text">
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
  return `
    <div class="cr-tor-bg"></div>
    <div class="cr-tor-canvas">${img}</div>
    <div class="cr-tor-glow"></div>
    <div class="cr-tor-vignette"></div>
    <div class="cr-tor-petals">${petals}</div>
    <div class="cr-tor-text">
      ${clanLabel ? `<div class="cr-tor-clan">✦ ${clanLabel.toUpperCase().split('').join(' ')} ✦</div>` : ''}
      ${name ? `<div class="cr-tor-name">${name}</div>` : ''}
      ${sub  ? `<div class="cr-tor-sub">${sub}</div>` : ''}
    </div>
  `;
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
    <div class="cr-gan-portrait">${img}</div>
    <div class="cr-gan-moon"></div>
    <div class="cr-gan-mist"></div>
    <svg class="cr-gan-scratches" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="28" x2="62" y2="52" class="cr-gan-claw cr-gan-claw--1"/>
      <line x1="4"  y1="33" x2="67" y2="57" class="cr-gan-claw cr-gan-claw--2"/>
      <line x1="9"  y1="39" x2="70" y2="63" class="cr-gan-claw cr-gan-claw--3"/>
    </svg>
    <div class="cr-gan-vignette"></div>
    <div class="cr-gan-text">
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
  const sparks = Array.from({length: 8}, (_, i) => {
    const angle = (i / 8) * 360 - 70;
    const dist  = 90 + (i % 3) * 45;
    const dx = Math.round(Math.cos(angle * Math.PI / 180) * dist);
    const dy = Math.round(Math.sin(angle * Math.PI / 180) * dist);
    return `<div class="cr-brj-spark" style="--i:${i};--dx:${dx}px;--dy:${dy}px"></div>`;
  }).join('');
  return `
    <div class="cr-brj-bg"></div>
    <div class="cr-brj-portrait">${img}</div>
    <div class="cr-brj-rings"></div>
    <div class="cr-brj-sparks">${sparks}</div>
    <div class="cr-brj-vignette"></div>
    <div class="cr-brj-text">
      ${clanLabel ? `<div class="cr-brj-clan">${clanLabel.toUpperCase()}</div>` : ''}
      ${name ? `<div class="cr-brj-name">${name}</div>` : ''}
      ${sub  ? `<div class="cr-brj-sub">${sub}</div>` : ''}
    </div>
  `;
}
