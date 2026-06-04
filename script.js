// ==========================================
// 0. STATO E CONFIGURAZIONI GLOBALI
// ==========================================
let bookHistoryEvents = [];
let isTransitioning = false;
let currentCoverIndex = null; 

// Array delle percentuali posizionali delle tacche sulla copertina
const ticks = [5, 11, 17, 23, 29, 35, 41, 47, 53, 59, 65, 71, 77, 83, 89, 95];

// Elementi principali del DOM
const mainTimelineBar = document.getElementById('timeline-bar');
const articleArea = document.getElementById('article-area');
const headerLogo = document.querySelector('.header-logo');
const mainContent = document.querySelector('.main-content');
const homeView = document.getElementById('home-view');
const backButton = document.getElementById('back-button');
const subheader = document.getElementById('subheader');

// Caricamento dati asincrono
async function loadArticles() {
  try {
    const response = await fetch('articoli.json'); 
    bookHistoryEvents = await response.json();
    renderLayout();
  } catch (error) {
    console.error("Errore nel caricamento degli articoli:", error);
  }
}
loadArticles();

// ==========================================
// 1. RENDER LAYOUT TIMELINE PRINCIPALE
// ==========================================
function renderLayout() {
  if (!mainTimelineBar || !articleArea) return;
  
  mainTimelineBar.innerHTML = '';
  articleArea.innerHTML = '';

  bookHistoryEvents.forEach((evt) => {
    const line = document.createElement('div');
    line.className = 'timeline-line';
    line.setAttribute('data-target', evt.id);
    
    const tagsArray = evt.tags || [];
    line.setAttribute('data-tags', tagsArray.join(' '));
    line.innerHTML = `<div class="label"><span class="label-title">${evt.title}</span></div>`;
    
    if (tagsArray.includes('positive')) {
      line.classList.add('always-long');
    }
    
    mainTimelineBar.appendChild(line);

    const card = document.createElement('article');
    card.className = 'article-card';
    card.id = evt.id;
    card.setAttribute('data-tags', tagsArray.join(' '));
    card.innerHTML = `
      <div class="article-card-header">
        <h2><span class="article-date-inline">${evt.date}</span> — ${evt.title}</h2>
        <span class="article-toggle">▼</span>
      </div>
      <div class="article-summary-block">${evt.summary}</div>
      <div class="article-card-content">
        <p>${evt.content}</p>
      </div>
    `;
    articleArea.appendChild(card);
  });

  setupTimelineInteractions();
}

function setupTimelineInteractions() {
  const lines = Array.from(document.querySelectorAll('.timeline-line'));
  const articles = Array.from(document.querySelectorAll('.article-card'));
  let collapseTimeoutId = null;

  lines.forEach((line, index) => {
    line.addEventListener('mouseenter', () => {
      if (collapseTimeoutId) { clearTimeout(collapseTimeoutId); collapseTimeoutId = null; }
      lines.forEach(l => l.classList.remove('hovered', 'hovered-above', 'hovered-below', 'hovered-near'));
      
      if (line.classList.contains('always-long')) {
        line.classList.add('hovered');
        return;
      }
      
      line.classList.add('hovered');
      if (index > 0 && !lines[index - 1].classList.contains('always-long')) lines[index - 1].classList.add('hovered-above');
      if (index < lines.length - 1 && !lines[index + 1].classList.contains('always-long')) lines[index + 1].classList.add('hovered-below');
      if (index > 1 && !lines[index - 2].classList.contains('always-long')) lines[index - 2].classList.add('hovered-near');
      if (index < lines.length - 2 && !lines[index + 2].classList.contains('always-long')) lines[index + 2].classList.add('hovered-near');
    });

    line.addEventListener('mouseleave', () => {
      collapseTimeoutId = setTimeout(() => {
        lines.forEach(l => l.classList.remove('hovered', 'hovered-above', 'hovered-below', 'hovered-near'));
      }, 800);
    });

    line.addEventListener('click', () => {
      lines.forEach(l => l.classList.remove('active'));
      line.classList.add('active');

      const targetId = line.getAttribute('data-target');
      const targetArticle = document.getElementById(targetId);
      
      if (targetArticle) {
        articles.forEach(art => art.classList.remove('expanded'));
        targetArticle.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetArticle.classList.add('expanded');
      }
    });
  });

  articles.forEach((card) => {
    const header = card.querySelector('.article-card-header');
    if (header) {
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        card.classList.toggle('expanded');
      });
    }
  });
}

// ==========================================
// 2. FILTRI
// ==========================================
const filterButtons = document.querySelectorAll('.filter-btn');
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const filterVal = btn.getAttribute('data-filter');
    const lines = Array.from(document.querySelectorAll('.timeline-line'));
    const articles = Array.from(document.querySelectorAll('.article-card'));
    let firstVisibleArticle = null;
    
    articles.forEach((art, index) => {
      const rawTags = art.getAttribute('data-tags');
      const artTags = rawTags ? rawTags.split(' ') : [];
      const correspondingLine = lines[index];
      
      if (filterVal === 'all' || artTags.includes(filterVal)) {
        art.classList.remove('filtered-out');
        if (correspondingLine) correspondingLine.classList.remove('filtered-out');
        if (!firstVisibleArticle) firstVisibleArticle = art;
      } else {
        art.classList.add('filtered-out');
        art.classList.remove('expanded'); 
        if (correspondingLine) correspondingLine.classList.add('filtered-out');
      }
    });
    if (firstVisibleArticle) firstVisibleArticle.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});

// ==========================================
// 3. NAVIGAZIONE INTERNA
// ==========================================
if (headerLogo && mainContent && homeView && subheader) {
  headerLogo.addEventListener('click', () => {
    mainContent.style.display = 'none';
    homeView.style.display = 'block';
    subheader.classList.add('hidden');
  });
}

if (backButton && homeView && mainContent && subheader) {
  backButton.addEventListener('click', () => {
    homeView.style.display = 'none';
    mainContent.style.display = 'flex';
    subheader.classList.remove('hidden');
  });
}

// ==========================================
// 4. ANIMAZIONE DI RIPPLE DELLA COPERTINA (Risolta, Coordinate Absolute)
// ==========================================
function hideInitialCover() {
  const cover = document.getElementById('initial-cover');
  if (cover) cover.style.display = 'none';
}

function triggerCoverAnimation(e) {
  // Blocca click multipli involontari durante la transizione
  if (isTransitioning) return;

  const ripple = document.getElementById('transition-ripple');
  const cover = document.getElementById('initial-cover');
  if (!ripple || !cover) return;
  
  isTransitioning = true; 
  
  // Rimuove la classe active per resettare l'effetto geometrico
  ripple.classList.remove('active');
  
  // Calcola il raggio di espansione per coprire qualsiasi diagonale dello schermo
  const radius = Math.max(window.innerWidth, window.innerHeight) * 1.5;
  
  // Sincronizzazione geometrica assoluta sul Viewport dello schermo
  ripple.style.position = 'fixed';
  ripple.style.width = `${radius * 2}px`;
  ripple.style.height = `${radius * 2}px`;
  ripple.style.left = `${e.clientX - radius}px`;
  ripple.style.top = `${e.clientY - radius}px`;
  
  // FORZA IL REFLOW: Obbliga il motore grafico del browser a registrare la posizione di partenza
  ripple.offsetHeight;
  
  // Attiva l'espansione (scale) definita nel CSS
  ripple.classList.add('active');
  
  // Dissolvenza della schermata di copertura intera
  setTimeout(() => {
    cover.classList.add('fade-out');
  }, 700); 
  
  // Pulizia del DOM e sblocco dello stato di transizione
  setTimeout(() => {
    cover.style.display = 'none';
    document.body.classList.remove('cover-active');
    isTransitioning = false; 
  }, 950);
}

// ==========================================
// 5. STRUTTURA ED EFFETTO FLIGHT DELLE TACCHE (Corretta)
// ==========================================
function scrollToMain() {
  if (isTransitioning) return; 

  const mainWrapper = document.getElementById('main-wrapper');
  const coverSection = document.querySelector('.cover-section');
  const tBar = document.getElementById('timeline-bar');
  const coverBar = document.querySelector('.cover-timeline-bar');
  
  if (mainWrapper) {
    isTransitioning = true;

    document.body.classList.remove('lock-scroll');
    
    // Sincronizzazione dell'articolo selezionato
    if (currentCoverIndex !== null && bookHistoryEvents[currentCoverIndex]) {
      const targetId = bookHistoryEvents[currentCoverIndex].id;
      const targetArticle = document.getElementById(targetId);
      const lines = document.querySelectorAll('.timeline-line');
      const articles = document.querySelectorAll('.article-card');
      
      articles.forEach(art => art.classList.remove('expanded'));
      lines.forEach(l => l.classList.remove('active'));
      
      if (targetArticle) {
        targetArticle.classList.add('expanded');
        if (lines[currentCoverIndex]) lines[currentCoverIndex].classList.add('active');
      }
    }

    // ANIMAZIONE FLIGHT DELLE TACCHE (Rotazione e Cambio Dimensioni)
    if (coverBar && tBar) {
      const coverRect = coverBar.getBoundingClientRect();

      // Apertura invisibile temporanea per calcolare le coordinate reali dei segmenti orizzontali sotto
      const originalDisplay = tBar.style.display;
      const originalVisibility = tBar.style.visibility;
      
      tBar.style.setProperty('display', 'flex', 'important');
      tBar.style.setProperty('visibility', 'hidden', 'important');

      const mainLines = tBar.querySelectorAll('.timeline-line');
      const targets = [];
      
      mainLines.forEach((line) => {
         const lineRect = line.getBoundingClientRect(); // rettangolo della SINGOLA LINEA, non del container
           const computedStyle = window.getComputedStyle(line);
  
           // Estraiamo lo spessore finale (es. 2px o 5px)
           const finalHeight = parseFloat(computedStyle.height) || 2; 

        targets.push({
          left: lineRect.left,
              // CALCOLO CENTRATO: (Top della linea) + (metà altezza linea) - (metà spessore della tacca animata)
               // Questo garantisce che la tacca si allinei perfettamente al centro della riga dell'indice
           top: lineRect.top + (lineRect.height / 2) - (finalHeight / 2),
            width: parseFloat(computedStyle.width) || 30,
           height: finalHeight
           });
        });

      // Ripristina lo stato visivo della barra sotto
      tBar.style.display = originalDisplay;
      tBar.style.visibility = originalVisibility;

      // Opacizza temporaneamente la barra di copertina per mostrare il distacco delle copie
      coverBar.style.opacity = '0.2';
      coverBar.style.transition = 'opacity 0.2s ease';

      // Generazione e lancio delle copie delle 16 tacche
      ticks.forEach((pct, index) => {

        // 1. Stato Iniziale: la tacca è VERTICALE e NERA sulla copertina

        const startLeft = coverRect.left + (coverRect.width * pct / 100);
        const startTop = coverRect.top;
        const startWidth = 2; // spessore iniziale verticale
        const startHeight = coverRect.height || 18; // altezza iniziale verticale

        // Valori di riserva se il target non viene trovato
        let endLeft = startLeft;
        let endTop = targets[index] ? targets[index].top : startTop + window.innerHeight;
        let endWidth = 30; 
        let endHeight = 2;

        if (targets[index]) {
          endLeft = targets[index].left;
          endTop = targets[index].top;
          endWidth = targets[index].width;   // Diventa 30px o 150px
          endHeight = targets[index].height; // Diventa 2px o 5px
        }

        // Creazione del clone animato
        const flyingTick = document.createElement('div');
        flyingTick.className = 'flying-tick';
        
        flyingTick.style.position = 'fixed';
        flyingTick.style.left = `${startLeft}px`;
        flyingTick.style.top = `${endTop}px`;
        flyingTick.style.width = `${startWidth}px`;
        flyingTick.style.height = `${startHeight}px`;
        flyingTick.style.backgroundColor = '#000000'; // Parte Nera
        flyingTick.style.zIndex = '100000';
        flyingTick.style.pointerEvents = 'none';
        flyingTick.style.borderRadius = '1px';

        // Configurazione transizione fluida di 800ms su tutte le proprietà geometriche e cromatiche
        flyingTick.style.transition = `
          left 0.8s cubic-bezier(0.25, 1, 0.5, 1), 
          top 0.8s cubic-bezier(0.25, 1, 0.5, 1), 
          width 0.8s cubic-bezier(0.25, 1, 0.5, 1), 
          height 0.4s cubic-bezier(0.25, 1, 0.5, 1), 
          background-color 0.2s ease
        `;

        document.body.appendChild(flyingTick);

        // Forza il reflow del browser per catturare lo stato verticale di partenza
        flyingTick.offsetHeight;

        // 2. Stato Finale: Trasformazione in ORIZZONTALE, BIANCA e allineata all'indice
        flyingTick.style.left = `${endLeft}px`;
        flyingTick.style.top = `${endTop}px`;
        flyingTick.style.width = `${endWidth}px`;   // Si allunga orizzontalmente (30px / 150px)
        flyingTick.style.height = `${endHeight}px`; // Si schiaccia diventando lo spessore della linea (2px / 5px)
        flyingTick.style.backgroundColor = '#ffffff'; // Diventa Bianca

        // Rimozione dal DOM al termine degli 800ms
        setTimeout(() => {
          flyingTick.remove();
        }, 800);
      });
    }
    
    // Avvia lo scroll della pagina verso il basso
    mainWrapper.scrollIntoView({ behavior: 'smooth' });
    
    setTimeout(() => {
      if (coverSection) {
        coverSection.classList.add('hidden'); 
        window.scrollTo(0, 0); 
        
        if (tBar) {
          tBar.classList.add('visible');
        }

        if (currentCoverIndex !== null && bookHistoryEvents[currentCoverIndex]) {
          const targetId = bookHistoryEvents[currentCoverIndex].id;
          const targetArticle = document.getElementById(targetId);
          if (targetArticle) {
            targetArticle.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        isTransitioning = false;
      }
    }, 800); 
  }
}
// ==========================================
// 6. DRAG & CLICK SULLA TIMELINE DELLA COPERTINA
// ==========================================
const coverTimelineBar = document.querySelector('.cover-timeline-bar');
const coverIndicator = document.querySelector('.cover-timeline-indicator');
const coverScrollButton = document.querySelector('.cover-scroll-button');

function updateButtonText(index) {
  if (!coverScrollButton) return;
  if (index === null) {
    coverScrollButton.textContent = "scorri giù ↓";
  } else if (bookHistoryEvents && bookHistoryEvents[index]) {
    coverScrollButton.textContent = bookHistoryEvents[index].title;
  }
}

function setIndicatorPosition(percentage, useTransition = true) {
  if (!coverIndicator) return;
  coverIndicator.style.transition = useTransition ? 'left 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none';
  coverIndicator.style.left = `${percentage}%`;
}

function getClosestTickIndex(currentPercentage) {
  return ticks.reduce((closestIdx, tickValue, idx) => {
    return Math.abs(tickValue - currentPercentage) < Math.abs(ticks[closestIdx] - currentPercentage) ? idx : closestIdx;
  }, 0);
}

// Dichiarata a livello globale: risolve il ReferenceError dei pulsanti nell'HTML
function moveTimeline(direction) {
  if (currentCoverIndex === null) {
    currentCoverIndex = direction > 0 ? 8 : 7;
  } else {
    currentCoverIndex = Math.max(0, Math.min(ticks.length - 1, currentCoverIndex + direction));
  }
  setIndicatorPosition(ticks[currentCoverIndex]);
  updateButtonText(currentCoverIndex);
}

let isDragging = false;

function handleMove(e) {
  if (!isDragging || !coverTimelineBar) return;

  const rect = coverTimelineBar.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  
  let percentage = ((clientX - rect.left) / rect.width) * 100;
  percentage = Math.max(5, Math.min(95, percentage));
  
  setIndicatorPosition(percentage, false);

  const temporaryIndex = getClosestTickIndex(percentage);
  updateButtonText(temporaryIndex);
}

function stopDragging() {
  if (!isDragging || !coverIndicator) return;
  isDragging = false;

  let currentLeft = parseFloat(coverIndicator.style.left);
  if (isNaN(currentLeft)) {
    currentLeft = 50; // Fallback al 50% (valore iniziale CSS) per evitare il bug del salto all'avvio
  }

  currentCoverIndex = getClosestTickIndex(currentLeft);

  setIndicatorPosition(ticks[currentCoverIndex], true);
  updateButtonText(currentCoverIndex);

  window.removeEventListener('mousemove', handleMove);
  window.removeEventListener('mouseup', stopDragging);
  window.removeEventListener('touchmove', handleMove);
  window.removeEventListener('touchend', stopDragging);
}

function startDragging(e) {
  isDragging = true;
  e.preventDefault(); 

  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', stopDragging);
  window.addEventListener('touchmove', handleMove, { passive: false });
  window.addEventListener('touchend', stopDragging);
}

if (coverIndicator && coverTimelineBar) {
  coverIndicator.addEventListener('mousedown', startDragging);
  coverIndicator.addEventListener('touchstart', startDragging, { passive: false });
  
  coverTimelineBar.addEventListener('mousedown', (e) => {
    if (e.target === coverIndicator) return;
    isDragging = true;
    handleMove(e);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopDragging);
  });
}

// ==========================================
// 7. INTERAZIONE DELLA MAPPA INFOGRAFICA
// ==========================================
const mapData = [
  { src: "BasiRisorse.png", caption: "Basi e risorse di appoggio degli Stati Uniti attaccate dall'Iran" },
  { src: "InfrastruttureEn.png", caption: "Le infrastrutture energetiche colpite" },
  { src: "Porti.png", caption: "Porti e aeroporti civili colpiti" },
  { src: "Sedi.png", caption: "Le sedi diplomatiche statunitensi colpite" }
];

let currentMapIndex = 0;

const mapImgEl = document.getElementById('map-img');
const mapCaptionEl = document.getElementById('map-caption');
const mapPrevBtn = document.getElementById('map-prev');
const mapNextBtn = document.getElementById('map-next');

function updateMapDisplay() {
  if (mapImgEl && mapCaptionEl && mapData[currentMapIndex]) {
    mapImgEl.src = mapData[currentMapIndex].src;
    mapCaptionEl.textContent = mapData[currentMapIndex].caption;
  }
}

if (mapPrevBtn && mapNextBtn) {
  mapPrevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentMapIndex = (currentMapIndex - 1 + mapData.length) % mapData.length;
    updateMapDisplay();
  });

  mapNextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentMapIndex = (currentMapIndex + 1) % mapData.length;
    updateMapDisplay();
  });
}

// ==========================================
// RIPRISTINO DELLA COPERTINA CON TIMELINE (Pulsante Mostra Copertina)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const backToCoverBtn = document.getElementById('back-to-cover-btn');

  if (backToCoverBtn) {
    backToCoverBtn.addEventListener('click', () => {
      const coverSection = document.getElementById('cover-section');
      const cover = document.getElementById('initial-cover');
      const ripple = document.getElementById('transition-ripple');
      const scrollBtn = document.querySelector('.cover-scroll-button');
      const coverBar = document.querySelector('.cover-timeline-bar');
      const tBar = document.getElementById('timeline-bar');
      
      

      // 1. Mostra la sezione della copertina reale (quella con la timeline)
      if (coverSection) {
        coverSection.classList.remove('hidden');
        coverSection.style.display = ''; 
      }
      
      // 2. MANTIENE NASCOSTA la primissima schermata di overlay col pulsantone
      if (cover) {
        cover.style.display = 'none';
      }

      // 3. Blocca lo scroll del body per rimetterlo in modalità copertina + ripple
      document.body.classList.add('cover-active', 'lock-scroll');

      if (ripple) {
        ripple.classList.remove('active');
        ripple.style.width = '0px';
        ripple.style.height = '0px';
      }

      // 4. Nasconde la barra della timeline dei contenuti del masterpost sotto
      if (tBar) {
        tBar.classList.remove('visible');
      }

      // 5. RIPRISTINA VISIBILE il pulsante "Scorri giù" (non scompare più)
      if (scrollBtn) {
        scrollBtn.style.display = 'block'; 
      }

      // 6. Ripristina l'opacità originale della barra di copertina
      if (coverBar) {
        coverBar.style.opacity = '1';
      }

      // 7. RESET DELLO STATO: Riporta l'indice alla prima tacca (0) e aggiorna la grafica
      currentCoverIndex = 0; 
      if (typeof updateTimelineIndicator === "function") {
        updateTimelineIndicator(); // Sposta l'indicatore rosso/arancione sulla prima tacca a sinistra
      }

      // 8. Riporta la pagina in cima istantaneamente per mostrare la copertina corretta + DOPO 0.5 SECONDI preme il filtro per tutti gli articoli 
      window.scrollTo({ top: 0, behavior: 'auto' });

       setTimeout(() => {
        const allFilterBtn = document.querySelector('.filter-btn[data-filter="all"]');
        
      }, 500);
    });
  }
});